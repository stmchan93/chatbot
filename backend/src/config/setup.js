import { connectMongoDB, closeDatabases } from './database.js';
import { initializeSchema } from './schema.js';
import { seedDatabase } from './seed.js';

export async function setupDatabase() {
  try {
    console.log('🚀 Setting up databases...');
    
    // Initialize SQLite schema
    initializeSchema();
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Seed data
    await seedDatabase();
    
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => {
      console.log('✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}
