import { sqliteDb } from '../config/database.js';

// Business hours: 8 AM to 5 PM
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 17;
const VALID_DURATIONS = [30, 60];
const VALID_TYPES = ['consultation', 'follow-up', 'emergency'];

// Helper function to format date as PST string (without UTC conversion)
function toPSTString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function getAvailability(req, res) {
  try {
    const { doctor_id, date, duration } = req.query;

    // Validation
    if (!doctor_id || !date || !duration) {
      return res.status(400).json({
        error: 'doctor_id, date, and duration are required'
      });
    }

    const durationNum = parseInt(duration);
    if (!VALID_DURATIONS.includes(durationNum)) {
      return res.status(400).json({
        error: 'Duration must be 30 or 60 minutes'
      });
    }

    // Get existing appointments for this doctor on this date
    const existingAppointments = sqliteDb
      .prepare(`
        SELECT start_time, end_time
        FROM appointments
        WHERE doctor_id = ?
          AND DATE(start_time) = DATE(?)
          AND status = 'scheduled'
        ORDER BY start_time
      `)
      .all(doctor_id, date);

    // Generate all possible time slots (in PST/local timezone)
    const availableSlots = [];
    const targetDate = new Date(date + 'T00:00:00');
    
    for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationNum);

        // Check if slot end is within business hours
        if (slotEnd.getHours() >= BUSINESS_END_HOUR) {
          continue;
        }

        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          
          // Two time ranges overlap if:
          // - Slot starts before appointment ends AND
          // - Slot ends after appointment starts
          // This catches ALL overlap cases including partial overlaps
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        if (!hasConflict) {
          availableSlots.push({
            start_time: toPSTString(slotStart),
            end_time: toPSTString(slotEnd)
          });
        }
      }
    }

    res.json({
      doctor_id: parseInt(doctor_id),
      date,
      duration: durationNum,
      available_slots: availableSlots
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function scheduleAppointment(req, res) {
  try {
    const { doctor_id, start_time, end_time, type, conversation_summary } = req.body;
    const patient_id = req.user.id;

    // Validation
    if (!doctor_id || !start_time || !end_time || !type) {
      return res.status(400).json({
        error: 'doctor_id, start_time, end_time, and type are required'
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Type must be one of: ${VALID_TYPES.join(', ')}`
      });
    }

    // Check for conflicts using simple overlap logic:
    // Two appointments overlap if one starts before the other ends AND ends after the other starts
    const conflicts = sqliteDb
      .prepare(`
        SELECT id
        FROM appointments
        WHERE doctor_id = ?
          AND status = 'scheduled'
          AND start_time < ?
          AND end_time > ?
      `)
      .all(doctor_id, end_time, start_time);

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Time slot conflict - appointment already exists at this time'
      });
    }

    // Insert appointment
    const result = sqliteDb
      .prepare(`
        INSERT INTO appointments (
          patient_id, doctor_id, start_time, end_time, type, conversation_summary
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(patient_id, doctor_id, start_time, end_time, type, conversation_summary || '');

    // Get the created appointment
    const appointment = sqliteDb
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Schedule appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function cancelAppointment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get appointment
    const appointment = sqliteDb
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check authorization (patient can cancel their own, doctors not implemented yet)
    if (userRole === 'patient' && appointment.patient_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }

    // Update status to cancelled
    sqliteDb
      .prepare('UPDATE appointments SET status = ? WHERE id = ?')
      .run('cancelled', id);

    res.json({
      message: 'Appointment cancelled successfully',
      id: parseInt(id)
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function rescheduleAppointment(req, res) {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!start_time || !end_time) {
      return res.status(400).json({
        error: 'start_time and end_time are required'
      });
    }

    // Get appointment
    const appointment = sqliteDb
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check authorization
    if (userRole === 'patient' && appointment.patient_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to reschedule this appointment' });
    }

    // Check for conflicts (excluding current appointment)
    const conflicts = sqliteDb
      .prepare(`
        SELECT id
        FROM appointments
        WHERE doctor_id = ?
          AND id != ?
          AND status = 'scheduled'
          AND (
            (start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time >= ? AND end_time <= ?)
          )
      `)
      .all(
        appointment.doctor_id,
        id,
        end_time, start_time,
        end_time, start_time,
        start_time, end_time
      );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Time slot conflict - appointment already exists at this time'
      });
    }

    // Update appointment
    sqliteDb
      .prepare('UPDATE appointments SET start_time = ?, end_time = ? WHERE id = ?')
      .run(start_time, end_time, id);

    // Get updated appointment
    const updatedAppointment = sqliteDb
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(id);

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
