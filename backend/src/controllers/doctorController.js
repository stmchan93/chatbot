import { sqliteDb } from '../config/database.js';

export function getAllDoctors(req, res) {
  try {
    const { specialty } = req.query;

    let query = 'SELECT id, name, specialty, email FROM doctors';
    const params = [];

    if (specialty) {
      query += ' WHERE specialty = ?';
      params.push(specialty);
    }

    const doctors = sqliteDb.prepare(query).all(...params);

    res.json({ doctors });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getDoctorAppointments(req, res) {
  try {
    const { doctorId } = req.params;
    const { start_date, end_date, view } = req.query;

    // Build query with optional date filters
    let query = `
      SELECT 
        a.id,
        a.start_time,
        a.end_time,
        a.type,
        a.status,
        a.conversation_summary,
        p.name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (start_date) {
      query += ' AND DATE(a.start_time) >= DATE(?)';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(a.start_time) <= DATE(?)';
      params.push(end_date);
    }

    query += ' ORDER BY a.start_time ASC';

    const appointments = sqliteDb.prepare(query).all(...params);

    res.json({ appointments });
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
