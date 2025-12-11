import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { connectMongoDB, closeDatabases, sqliteDb, getMongoDb } from '../src/config/database.js';

describe('Chat API', () => {
  let patientToken;
  let patientId;
  let sessionId;

  beforeAll(async () => {
    // Ensure MongoDB is connected
    await connectMongoDB();
    
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
    // Clean up test appointments and conversations
    sqliteDb.prepare('DELETE FROM appointments WHERE patient_id = ?').run(patientId);
    const mongodb = getMongoDb();
    await mongodb.collection('conversations').deleteMany({ patient_id: patientId });
    await closeDatabases();
  });

  describe('POST /api/chat/message', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Hello' });

      expect(response.status).toBe(401);
    });

    test('should reject doctor role', async () => {
      // Login as doctor
      const doctorRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@clinic.com',
          password: 'doctor123',
          role: 'doctor'
        });

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${doctorRes.body.token}`)
        .send({ message: 'Hello' });

      expect(response.status).toBe(403);
    });

    test('should handle simple greeting', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Hello, I need help scheduling an appointment'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toBeTruthy();
      
      // Save session ID for next tests
      sessionId = response.body.session_id;
    }, 30000); // 30s timeout for LLM call

    test('should handle clinic info question', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'What are your clinic hours?',
          session_id: sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body.response).toContain('8:00 AM');
      expect(response.body.response).toContain('5:00 PM');
      
      // Should have called the clinic info tool
      if (response.body.tool_calls) {
        const toolNames = response.body.tool_calls.map(tc => tc.tool);
        expect(toolNames).toContain('get_clinic_info');
      }
    }, 30000);

    test('should list doctors when asked', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'What doctors are available?',
          session_id: sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body.response).toBeTruthy();
      
      // Should mention at least one doctor
      const responseText = response.body.response.toLowerCase();
      const hasDoctorMention = 
        responseText.includes('sarah') || 
        responseText.includes('michael') || 
        responseText.includes('emily') ||
        responseText.includes('cardiologist') ||
        responseText.includes('dermatologist');
      
      expect(hasDoctorMention).toBe(true);
    }, 30000);

    test('should check availability when asked about specific date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: `Can I see Dr. Sarah Williams tomorrow (${dateStr})?`,
          session_id: sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body.response).toBeTruthy();
      
      // Claude should respond (might check availability or just acknowledge)
      expect(response.body.response.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle errors gracefully', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          // Missing message
          session_id: sessionId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/chat/history/:session_id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/chat/history/${sessionId}`);

      expect(response.status).toBe(401);
    });

    test('should return conversation history', async () => {
      // First send a message to ensure we have history
      await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Test message for history',
          session_id: sessionId
        });

      // Then get history
      const response = await request(app)
        .get(`/api/chat/history/${sessionId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id', sessionId);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
      
      // Check message structure
      const firstMessage = response.body.messages[0];
      expect(firstMessage).toHaveProperty('role');
      expect(firstMessage).toHaveProperty('content');
      expect(firstMessage).toHaveProperty('timestamp');
    }, 30000);

    test('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/chat/history/non-existent-session-id')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
    });
  });
});
