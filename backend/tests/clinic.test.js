import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { connectMongoDB, closeDatabases } from '../src/config/database.js';

describe('Clinic API', () => {
  beforeAll(async () => {
    // Ensure MongoDB is connected before tests run
    await connectMongoDB();
  });

  afterAll(async () => {
    await closeDatabases();
  });

  describe('GET /api/clinic/info', () => {
    test('should return clinic information', async () => {
      const response = await request(app).get('/api/clinic/info');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: expect.any(String),
        hours: expect.any(String),
        location: expect.any(String),
        phone: expect.any(String),
        email: expect.any(String)
      });
      expect(response.body).not.toHaveProperty('_id');
    });
  });
});
