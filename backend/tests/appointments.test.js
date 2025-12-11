import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { closeDatabases, sqliteDb } from '../src/config/database.js';

describe('Appointments API', () => {
  let patientToken;
  let patientId;

  beforeAll(async () => {
    // Login as patient
    const patientRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'patient123',
        role: 'patient'
      });
    patientToken = patientRes.body.token;
    patientId = patientRes.body.user.id;
  });

  afterAll(async () => {
    // Clean up test appointments
    sqliteDb.prepare('DELETE FROM appointments WHERE patient_id = ?').run(patientId);
    await closeDatabases();
  });

  describe('GET /api/appointments/availability', () => {
    test('should return available slots for a doctor', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/appointments/availability')
        .query({
          doctor_id: 1,
          date: dateStr,
          duration: 30
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('available_slots');
      expect(Array.isArray(response.body.available_slots)).toBe(true);
      expect(response.body.doctor_id).toBe(1);
      expect(response.body.date).toBe(dateStr);
    });

    test('should require all parameters', async () => {
      const response = await request(app)
        .get('/api/appointments/availability')
        .query({ doctor_id: 1 });

      expect(response.status).toBe(400);
    });

    test('should validate duration (30 or 60 only)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/appointments/availability')
        .query({
          doctor_id: 1,
          date: dateStr,
          duration: 45  // Invalid
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/appointments/schedule', () => {
    test('should schedule an appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const startTime = tomorrow.toISOString();
      const endTime = new Date(tomorrow.getTime() + 30 * 60000).toISOString();

      const response = await request(app)
        .post('/api/appointments/schedule')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          start_time: startTime,
          end_time: endTime,
          type: 'consultation',
          conversation_summary: 'Patient has chest pain, needs cardiologist consultation'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        patient_id: patientId,
        doctor_id: 1,
        type: 'consultation',
        status: 'scheduled'
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/appointments/schedule')
        .send({
          doctor_id: 1,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          type: 'consultation'
        });

      expect(response.status).toBe(401);
    });

    test('should prevent double booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setHours(14, 0, 0, 0);
      
      const startTime = tomorrow.toISOString();
      const endTime = new Date(tomorrow.getTime() + 30 * 60000).toISOString();

      // First booking
      await request(app)
        .post('/api/appointments/schedule')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          start_time: startTime,
          end_time: endTime,
          type: 'consultation',
          conversation_summary: 'First appointment'
        });

      // Try to book same time
      const response = await request(app)
        .post('/api/appointments/schedule')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          start_time: startTime,
          end_time: endTime,
          type: 'consultation',
          conversation_summary: 'Conflicting appointment'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('conflict');
    });

    test('should validate appointment type', async () => {
      const response = await request(app)
        .post('/api/appointments/schedule')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          type: 'invalid-type'
        });

      expect(response.status).toBe(400);
    });
  });
});
