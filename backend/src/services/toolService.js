import { sqliteDb, getMongoDb } from '../config/database.js';

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

/**
 * Execute a tool call from Claude
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} toolInput - Input parameters for the tool
 * @param {number} patientId - ID of the patient making the request
 * @param {string} token - JWT token for API calls
 * @returns {Promise<Object>} Result of the tool execution
 */
export async function executeTool(toolName, toolInput, patientId, token) {
  const baseURL = `http://localhost:${process.env.PORT || 3000}/api`;
  
  try {
    switch (toolName) {
      case 'get_clinic_info':
        return await getClinicInfo();
      
      case 'list_doctors':
        return await listDoctors(toolInput.specialty);
      
      case 'check_availability':
        return await checkAvailability(toolInput);
      
      case 'schedule_appointment':
        return await scheduleAppointment(toolInput, patientId, token);
      
      case 'cancel_appointment':
        return await cancelAppointment(toolInput.appointment_id, token);
      
      case 'reschedule_appointment':
        return await rescheduleAppointment(toolInput, token);
      
      case 'get_patient_appointments':
        return await getPatientAppointments(patientId);
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { error: error.message || 'Tool execution failed' };
  }
}

async function getClinicInfo() {
  const mongodb = getMongoDb();
  const clinicInfo = await mongodb.collection('clinic_info').findOne({});
  if (!clinicInfo) {
    return { error: 'Clinic information not found' };
  }
  const { _id, ...data } = clinicInfo;
  return data;
}

function listDoctors(specialty) {
  let query = 'SELECT id, name, specialty, email FROM doctors';
  const params = [];
  
  if (specialty) {
    query += ' WHERE specialty = ?';
    params.push(specialty);
  }
  
  const doctors = sqliteDb.prepare(query).all(...params);
  return { doctors };
}

async function checkAvailability({ doctor_id, date, duration }) {
  // Get existing appointments
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

  // Generate available slots (in PST/local timezone)
  const availableSlots = [];
  const targetDate = new Date(date + 'T00:00:00');
  const BUSINESS_START_HOUR = 8;
  const BUSINESS_END_HOUR = 17;
  
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(hour, minute, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      if (slotEnd.getHours() >= BUSINESS_END_HOUR) {
        continue;
      }

      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        
        // Two time ranges overlap if:
        // - Slot starts before appointment ends AND
        // - Slot ends after appointment starts
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

  return {
    doctor_id,
    date,
    duration,
    available_slots: availableSlots
  };
}

async function scheduleAppointment({ doctor_id, start_time, end_time, type, summary }, patientId, token) {
  // Check for conflicts
  const conflicts = sqliteDb
    .prepare(`
      SELECT id
      FROM appointments
      WHERE doctor_id = ?
        AND status = 'scheduled'
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND end_time <= ?)
        )
    `)
    .all(
      doctor_id,
      end_time, start_time,
      end_time, start_time,
      start_time, end_time
    );

  if (conflicts.length > 0) {
    return { error: 'Time slot conflict - this time is already booked' };
  }

  // Insert appointment
  const result = sqliteDb
    .prepare(`
      INSERT INTO appointments (
        patient_id, doctor_id, start_time, end_time, type, conversation_summary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(patientId, doctor_id, start_time, end_time, type, summary);

  const appointment = sqliteDb
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(result.lastInsertRowid);

  return { success: true, appointment };
}

async function cancelAppointment(appointmentId, token) {
  const appointment = sqliteDb
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(appointmentId);

  if (!appointment) {
    return { error: 'Appointment not found' };
  }

  sqliteDb
    .prepare('UPDATE appointments SET status = ? WHERE id = ?')
    .run('cancelled', appointmentId);

  return { success: true, message: 'Appointment cancelled successfully' };
}

async function rescheduleAppointment({ appointment_id, start_time, end_time }, token) {
  const appointment = sqliteDb
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(appointment_id);

  if (!appointment) {
    return { error: 'Appointment not found' };
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
      appointment_id,
      end_time, start_time,
      end_time, start_time,
      start_time, end_time
    );

  if (conflicts.length > 0) {
    return { error: 'Time slot conflict - this time is already booked' };
  }

  sqliteDb
    .prepare('UPDATE appointments SET start_time = ?, end_time = ? WHERE id = ?')
    .run(start_time, end_time, appointment_id);

  const updatedAppointment = sqliteDb
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(appointment_id);

  return { success: true, appointment: updatedAppointment };
}

function getPatientAppointments(patientId) {
  const appointments = sqliteDb
    .prepare(`
      SELECT 
        a.*,
        d.name as doctor_name,
        d.specialty as doctor_specialty
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = ?
        AND a.status = 'scheduled'
      ORDER BY a.start_time ASC
    `)
    .all(patientId);

  return { appointments };
}
