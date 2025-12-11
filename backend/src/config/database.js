import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite Database
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../database.sqlite');
export const sqliteDb = new Database(dbPath);

// Enable foreign keys
sqliteDb.pragma('foreign_keys = ON');

console.log('✅ SQLite database connected');

// MongoDB Database
let mongoClient;
let mongodb;

export async function connectMongoDB() {
  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    mongodb = mongoClient.db();
    console.log('✅ MongoDB connected');
    return mongodb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getMongoDb() {
  if (!mongodb) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return mongodb;
}

export async function closeDatabases() {
  sqliteDb.close();
  if (mongoClient) {
    await mongoClient.close();
  }
  console.log('🔌 Databases closed');
}
