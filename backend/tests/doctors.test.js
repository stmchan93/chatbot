import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { closeDatabases } from '../src/config/database.js';

describe('Doctor API', () => {
  let doctorToken;
  let patientToken;

  beforeAll(async () => {
    // Login as doctor to get token
    const doctorRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah@clinic.com',
        password: 'doctor123',
        role: 'doctor'
      });
    doctorToken = doctorRes.body.token;

    // Login as patient to get token
    const patientRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'patient123',
        role: 'patient'
      });
    patientToken = patientRes.body.token;
  });

  afterAll(async () => {
    await closeDatabases();
  });

  describe('GET /api/doctors', () => {
    test('should return list of all doctors', async () => {
      const response = await request(app)
        .get('/api/doctors');

      expect(response.status).toBe(200);
      expect(response.body.doctors).toHaveLength(3);
      expect(response.body.doctors[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        specialty: expect.any(String)
      });
      expect(response.body.doctors[0]).not.toHaveProperty('password');
    });

    test('should filter doctors by specialty', async () => {
      const response = await request(app)
        .get('/api/doctors?specialty=Cardiologist');

      expect(response.status).toBe(200);
      expect(response.body.doctors).toHaveLength(1);
      expect(response.body.doctors[0].specialty).toBe('Cardiologist');
    });
  });

  describe('GET /api/doctors/:doctorId/appointments', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/doctors/1/appointments');

      expect(response.status).toBe(401);
    });

    test('should return appointments for authenticated doctor', async () => {
      const response = await request(app)
        .get('/api/doctors/1/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);
    });

    test('should reject patient accessing doctor appointments', async () => {
      const response = await request(app)
        .get('/api/doctors/1/appointments')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });
});
