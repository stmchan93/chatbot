import { sqliteDb, connectMongoDB, getMongoDb, closeDatabases } from '../src/config/database.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Database Setup', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await closeDatabases();
  });

  describe('SQLite', () => {
    test('should have patients table with data', () => {
      const patients = sqliteDb.prepare('SELECT * FROM patients').all();
      expect(patients.length).toBeGreaterThan(0);
      expect(patients[0]).toHaveProperty('name');
      expect(patients[0]).toHaveProperty('email');
      expect(patients[0]).toHaveProperty('phone');
    });

    test('should have doctors table with data', () => {
      const doctors = sqliteDb.prepare('SELECT * FROM doctors').all();
      expect(doctors.length).toBe(3);
      expect(doctors[0]).toHaveProperty('name');
      expect(doctors[0]).toHaveProperty('specialty');
      expect(doctors[0]).toHaveProperty('email');
    });

    test('should have appointments table', () => {
      const result = sqliteDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'"
      ).get();
      expect(result).toBeDefined();
      expect(result.name).toBe('appointments');
    });

    test('should have proper indexes', () => {
      const indexes = sqliteDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='appointments'"
      ).all();
      expect(indexes.length).toBeGreaterThan(0);
    });
  });

  describe('MongoDB', () => {
    test('should connect to MongoDB', () => {
      const db = getMongoDb();
      expect(db).toBeDefined();
    });

    test('should have clinic_info collection with data', async () => {
      const db = getMongoDb();
      const clinicInfo = await db.collection('clinic_info').findOne({});
      expect(clinicInfo).toBeDefined();
      expect(clinicInfo).toHaveProperty('name');
      expect(clinicInfo).toHaveProperty('hours');
      expect(clinicInfo).toHaveProperty('location');
      expect(clinicInfo).toHaveProperty('phone');
    });
  });
});
