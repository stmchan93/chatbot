// Set NODE_ENV to test before anything else loads
process.env.NODE_ENV = 'test';

// Import database setup once for all tests
import { setupDatabase } from '../src/config/setup.js';

// Initialize database once before all tests
let initialized = false;

global.beforeAll = async (fn) => {
  if (!initialized) {
    await setupDatabase();
    initialized = true;
  }
  if (fn) await fn();
};
