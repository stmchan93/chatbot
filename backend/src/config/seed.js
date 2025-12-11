import { sqliteDb, getMongoDb } from '../config/database.js';
import bcrypt from 'bcrypt';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // Check if data already exists
  const patientCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM patients').get();
  const doctorCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM doctors').get();

  if (patientCount.count > 0 || doctorCount.count > 0) {
    console.log('⚠️  Database already seeded. Skipping...');
    return;
  }

  // Seed Patients (for MVP, using simple passwords)
  const patients = [
    { name: 'John Doe', email: 'john@example.com', phone: '555-0101', password: 'patient123' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', password: 'patient123' },
    { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0103', password: 'patient123' }
  ];

  const insertPatient = sqliteDb.prepare(
    'INSERT INTO patients (name, email, phone, password) VALUES (?, ?, ?, ?)'
  );

  for (const patient of patients) {
    // For MVP, we'll hash passwords but use simple ones
    const hashedPassword = await bcrypt.hash(patient.password, 10);
    insertPatient.run(patient.name, patient.email, patient.phone, hashedPassword);
  }
  console.log('✅ Seeded 3 patients');

  // Seed Doctors
  const doctors = [
    { name: 'Dr. Sarah Williams', specialty: 'Cardiologist', email: 'sarah@clinic.com', password: 'doctor123' },
    { name: 'Dr. Michael Chen', specialty: 'Dermatologist', email: 'michael@clinic.com', password: 'doctor123' },
    { name: 'Dr. Emily Rodriguez', specialty: 'General Practitioner', email: 'emily@clinic.com', password: 'doctor123' }
  ];

  const insertDoctor = sqliteDb.prepare(
    'INSERT INTO doctors (name, specialty, email, password) VALUES (?, ?, ?, ?)'
  );

  for (const doctor of doctors) {
    const hashedPassword = await bcrypt.hash(doctor.password, 10);
    insertDoctor.run(doctor.name, doctor.specialty, doctor.email, hashedPassword);
  }
  console.log('✅ Seeded 3 doctors');

  // Seed MongoDB clinic info
  const mongodb = getMongoDb();
  const clinicInfoCollection = mongodb.collection('clinic_info');

  // Check if clinic info already exists
  const existingClinic = await clinicInfoCollection.findOne({});
  if (!existingClinic) {
    await clinicInfoCollection.insertOne({
      name: 'HealthCare Plus Medical Center',
      hours: 'Monday-Friday: 8:00 AM - 5:00 PM',
      location: '123 Medical Plaza, Suite 100, San Francisco, CA 94102',
      phone: '(555) 123-4567',
      email: 'info@healthcareplus.com',
      created_at: new Date()
    });
    console.log('✅ Seeded clinic information');
  }

  console.log('🎉 Database seeding complete!');
}
