/**
 * End-to-End Integration Tests for Doctor Portal
 * Tests complete user flows from patient booking to doctor viewing
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getDb } from '../src/config/database.js';

const API_BASE = 'http://localhost:3000/api';

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  return { response, data };
}

// Helper to login and get token
async function login(email, password, role) {
  const { response, data } = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  
  expect(response.ok).toBe(true);
  expect(data.token).toBeDefined();
  expect(data.user).toBeDefined();
  
  return data;
}

// Helper to send chat message
async function sendChatMessage(token, message, sessionId = null) {
  const sid = sessionId || `test_session_${Date.now()}`;
  
  const { response, data } = await apiCall('/chat/message', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      message,
      session_id: sid,
    }),
  });
  
  expect(response.ok).toBe(true);
  return { ...data, session_id: sid };
}

// Helper to get doctor's appointments
async function getDoctorAppointments(token, doctorId) {
  const { response, data } = await apiCall(`/doctors/${doctorId}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  expect(response.ok).toBe(true);
  return data.appointments;
}

// Helper to clean up test appointments
async function cleanupAppointments() {
  const db = getDb();
  // Delete appointments created during tests (keep seed data)
  db.prepare('DELETE FROM appointments WHERE id > 5').run();
}

describe('End-to-End Integration Tests', () => {
  let patientToken;
  let patientUser;
  let doctorToken;
  let doctorUser;
  
  beforeAll(async () => {
    // Login as patient
    const patientLogin = await login('john@example.com', 'patient123', 'patient');
    patientToken = patientLogin.token;
    patientUser = patientLogin.user;
    
    // Login as doctor
    const doctorLogin = await login('sarah@clinic.com', 'doctor123', 'doctor');
    doctorToken = doctorLogin.token;
    doctorUser = doctorLogin.user;
  });
  
  beforeEach(async () => {
    // Clean up test appointments before each test
    await cleanupAppointments();
  });
  
  afterAll(async () => {
    // Final cleanup
    await cleanupAppointments();
  });

  describe('Scenario 1: Book Appointment Flow', () => {
    test('Patient books appointment via chatbot and doctor sees it', async () => {
      console.log('\n📋 TEST: Book Appointment Flow');
      console.log('Step 1: Patient requests appointment via chatbot...');
      
      // Step 1: Patient books appointment through chat
      const sessionId = `test_booking_${Date.now()}`;
      const chatResponse = await sendChatMessage(
        patientToken,
        'I need to see Dr. Sarah Williams on December 20th at 2pm for a consultation',
        sessionId
      );
      
      console.log('Chatbot response:', chatResponse.response.substring(0, 100) + '...');
      
      // Verify chatbot confirmed the booking
      expect(chatResponse.response).toBeDefined();
      expect(chatResponse.response.toLowerCase()).toMatch(/appointment|scheduled|confirmed|booked/);
      
      // Wait a moment for the booking to be processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Step 2: Doctor checks their calendar...');
      
      // Step 2: Doctor views their appointments
      const appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      
      console.log(`Found ${appointments.length} appointment(s)`);
      
      // Verify appointment appears in doctor's calendar
      expect(appointments.length).toBeGreaterThan(0);
      
      const newAppointment = appointments.find(apt => 
        apt.patient_name === patientUser.name &&
        apt.type === 'consultation'
      );
      
      expect(newAppointment).toBeDefined();
      expect(newAppointment.patient_name).toBe(patientUser.name);
      expect(newAppointment.patient_email).toBe(patientUser.email);
      expect(newAppointment.status).toBe('scheduled');
      
      console.log('✅ Appointment successfully booked and visible to doctor');
      console.log(`   Patient: ${newAppointment.patient_name}`);
      console.log(`   Time: ${newAppointment.start_time}`);
      console.log(`   Type: ${newAppointment.type}`);
    });
  });

  describe('Scenario 2: Cancel Appointment Flow', () => {
    test('Patient cancels appointment and slot becomes available', async () => {
      console.log('\n📋 TEST: Cancel Appointment Flow');
      console.log('Step 1: Patient books initial appointment...');
      
      // Step 1: First, book an appointment
      const sessionId = `test_cancel_${Date.now()}`;
      const bookingResponse = await sendChatMessage(
        patientToken,
        'Book me an appointment with Dr. Sarah Williams on December 22nd at 10am',
        sessionId
      );
      
      expect(bookingResponse.response.toLowerCase()).toMatch(/appointment|scheduled|confirmed|booked/);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify appointment was created
      let appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      const bookedAppointment = appointments.find(apt => 
        apt.patient_name === patientUser.name
      );
      expect(bookedAppointment).toBeDefined();
      const appointmentId = bookedAppointment.id;
      
      console.log(`   Appointment #${appointmentId} created`);
      console.log('Step 2: Patient cancels the appointment...');
      
      // Step 2: Cancel the appointment
      const cancelResponse = await sendChatMessage(
        patientToken,
        `Cancel my appointment on December 22nd at 10am`,
        sessionId
      );
      
      console.log('Chatbot response:', cancelResponse.response.substring(0, 100) + '...');
      expect(cancelResponse.response.toLowerCase()).toMatch(/cancel|cancelled|removed/);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Step 3: Doctor checks calendar...');
      
      // Step 3: Verify appointment is cancelled in database
      const db = getDb();
      const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
      expect(appointment.status).toBe('cancelled');
      
      console.log(`   Appointment #${appointmentId} status: ${appointment.status}`);
      
      console.log('Step 4: Verify time slot is available for rebooking...');
      
      // Step 4: Try to book the same slot again
      const rebookResponse = await sendChatMessage(
        patientToken,
        'Book me an appointment with Dr. Sarah Williams on December 22nd at 10am',
        sessionId
      );
      
      // Should be able to book the same slot
      expect(rebookResponse.response.toLowerCase()).toMatch(/appointment|scheduled|confirmed|booked/);
      expect(rebookResponse.response.toLowerCase()).not.toMatch(/not available|unavailable|conflict/);
      
      console.log('✅ Cancellation successful and slot available for rebooking');
    });
  });

  describe('Scenario 3: Reschedule Appointment Flow', () => {
    test('Patient reschedules appointment to different time', async () => {
      console.log('\n📋 TEST: Reschedule Appointment Flow');
      console.log('Step 1: Patient books initial appointment...');
      
      // Step 1: Book initial appointment
      const sessionId = `test_reschedule_${Date.now()}`;
      await sendChatMessage(
        patientToken,
        'Book me an appointment with Dr. Sarah Williams on December 23rd at 9am',
        sessionId
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      const originalAppointment = appointments.find(apt => 
        apt.patient_name === patientUser.name
      );
      expect(originalAppointment).toBeDefined();
      
      console.log(`   Original appointment at: ${originalAppointment.start_time}`);
      console.log('Step 2: Patient requests to reschedule...');
      
      // Step 2: Reschedule to different time
      const rescheduleResponse = await sendChatMessage(
        patientToken,
        'Can I reschedule my appointment on December 23rd to 2pm instead?',
        sessionId
      );
      
      console.log('Chatbot response:', rescheduleResponse.response.substring(0, 100) + '...');
      expect(rescheduleResponse.response.toLowerCase()).toMatch(/reschedule|moved|changed|updated/);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Step 3: Doctor checks calendar for updated time...');
      
      // Step 3: Verify appointment is at new time
      appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      const rescheduledAppointment = appointments.find(apt => 
        apt.id === originalAppointment.id
      );
      
      expect(rescheduledAppointment).toBeDefined();
      expect(rescheduledAppointment.start_time).not.toBe(originalAppointment.start_time);
      
      console.log(`   New appointment time: ${rescheduledAppointment.start_time}`);
      console.log('✅ Appointment successfully rescheduled');
    });
  });

  describe('Scenario 4: Conflict Prevention', () => {
    test('Chatbot prevents double-booking and suggests alternatives', async () => {
      console.log('\n📋 TEST: Conflict Prevention');
      console.log('Step 1: First patient books a time slot...');
      
      // Step 1: First patient books a slot
      const session1 = `test_conflict1_${Date.now()}`;
      await sendChatMessage(
        patientToken,
        'Book me with Dr. Sarah Williams on December 24th at 11am',
        session1
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      const firstAppointment = appointments.find(apt => 
        apt.patient_name === patientUser.name
      );
      expect(firstAppointment).toBeDefined();
      
      console.log(`   First appointment booked at: ${firstAppointment.start_time}`);
      console.log('Step 2: Second patient tries to book same slot...');
      
      // Step 2: Second patient tries to book the same slot
      const jane = await login('jane@example.com', 'patient123', 'patient');
      const session2 = `test_conflict2_${Date.now()}`;
      
      const conflictResponse = await sendChatMessage(
        jane.token,
        'I need Dr. Sarah Williams on December 24th at 11am',
        session2
      );
      
      console.log('Chatbot response:', conflictResponse.response.substring(0, 150) + '...');
      
      // Should indicate slot is not available
      expect(conflictResponse.response.toLowerCase()).toMatch(
        /not available|unavailable|already booked|conflict|occupied/
      );
      
      // Should suggest alternative times
      expect(conflictResponse.response.toLowerCase()).toMatch(
        /available|alternative|other|different|suggest/
      );
      
      console.log('✅ Conflict detected and alternatives suggested');
      
      // Verify no double-booking occurred
      appointments = await getDoctorAppointments(doctorToken, doctorUser.id);
      const conflictingAppointments = appointments.filter(apt => 
        apt.start_time === firstAppointment.start_time
      );
      
      expect(conflictingAppointments.length).toBe(1);
      console.log('✅ Confirmed: No double-booking occurred');
    });
  });
});
