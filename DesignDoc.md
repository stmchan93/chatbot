# Doctor Portal - MVP Design Document

**Date:** December 11, 2025  
**Version:** 1.0 (MVP)

## Executive Summary

A healthcare scheduling application that provides patients with an AI-powered chatbot interface for booking appointments and doctors with an admin dashboard to view their schedules.

## System Architecture

### Tech Stack

**Frontend:**
- React
- react-big-calendar (for doctor dashboard)

**Backend:**
- Node.js with Express
- Anthropic Claude API (for chatbot)

**Databases:**
- SQLite (scheduling data: patients, doctors, appointments)
- MongoDB (conversation history)

**Deployment:**
- Local development environment

---

## Core Features

### 1. Patient Chat Interface
- AI-powered chatbot for natural conversation
- Schedule, reschedule, and cancel appointments through chat
- Query clinic information (hours, location, doctor availability)
- Persistent conversation history

### 2. Doctor Admin Dashboard
- Calendar view of appointments
- View appointment details (patient info, time, type, conversation summary)
- Filter by week/month/year

### 3. Scheduling Service
- Conflict prevention with time slot locking
- Support for multiple appointment types and durations
- Availability checking based on doctor schedules

---

## Data Models

### SQLite Schema

#### Patients Table
```sql
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,  -- hashed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Doctors Table
```sql
CREATE TABLE doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- hashed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Appointments Table
```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  type TEXT NOT NULL,  -- consultation, follow-up, emergency
  conversation_summary TEXT,
  status TEXT DEFAULT 'scheduled',  -- scheduled, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
```

### MongoDB Collections

#### Conversations Collection
```javascript
{
  _id: ObjectId,
  session_id: String,
  patient_id: Number,
  messages: [
    {
      role: String,  // 'user' | 'assistant' | 'system'
      content: String,
      timestamp: Date
    }
  ],
  created_at: Date,
  updated_at: Date
}
```

#### Clinic Info Collection (Single Document)
```javascript
{
  _id: ObjectId,
  name: String,
  hours: String,  // e.g., "Monday-Friday: 8:00 AM - 5:00 PM"
  location: String,
  phone: String,
  email: String
}
```

---

## API Specification

### Base URL
`http://localhost:3000/api`

### Authentication Endpoints

#### POST /api/auth/login
Login for both patients and doctors.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "role": "patient" | "doctor"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "number",
    "name": "string",
    "email": "string",
    "role": "patient" | "doctor"
  }
}
```

---

### Scheduling Endpoints

#### POST /api/appointments/schedule
Schedule a new appointment.

**Request:**
```json
{
  "patient_id": "number",
  "doctor_id": "number",
  "start_time": "ISO8601 datetime",
  "end_time": "ISO8601 datetime",
  "type": "consultation" | "follow-up" | "emergency",
  "conversation_summary": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "patient_id": "number",
  "doctor_id": "number",
  "start_time": "ISO8601 datetime",
  "end_time": "ISO8601 datetime",
  "type": "string",
  "status": "scheduled"
}
```

#### DELETE /api/appointments/:id/cancel
Cancel an existing appointment.

**Response:**
```json
{
  "message": "Appointment cancelled successfully",
  "id": "number"
}
```

#### PUT /api/appointments/:id/reschedule
Reschedule an existing appointment.

**Request:**
```json
{
  "start_time": "ISO8601 datetime",
  "end_time": "ISO8601 datetime"
}
```

**Response:**
```json
{
  "id": "number",
  "start_time": "ISO8601 datetime",
  "end_time": "ISO8601 datetime",
  "status": "scheduled"
}
```

#### GET /api/appointments/availability
Check doctor availability for booking.

**Query Parameters:**
- `doctor_id`: number
- `date`: YYYY-MM-DD
- `duration`: number (30 or 60 minutes)

**Response:**
```json
{
  "doctor_id": "number",
  "date": "YYYY-MM-DD",
  "available_slots": [
    {
      "start_time": "ISO8601 datetime",
      "end_time": "ISO8601 datetime"
    }
  ]
}
```

---

### Doctor Endpoints

#### GET /api/doctors
Get list of all doctors with their specialties.

**Response:**
```json
{
  "doctors": [
    {
      "id": "number",
      "name": "string",
      "specialty": "string"
    }
  ]
}
```

#### GET /api/doctors/:doctorId/appointments
Get appointments for a specific doctor.

**Query Parameters:**
- `start_date`: YYYY-MM-DD (optional)
- `end_date`: YYYY-MM-DD (optional)
- `view`: "week" | "month" | "year" (optional)

**Response:**
```json
{
  "appointments": [
    {
      "id": "number",
      "patient_name": "string",
      "patient_email": "string",
      "patient_phone": "string",
      "start_time": "ISO8601 datetime",
      "end_time": "ISO8601 datetime",
      "type": "string",
      "conversation_summary": "string",
      "status": "string"
    }
  ]
}
```

---

### Patient Endpoints

#### GET /api/patients/me
Get current logged-in patient information.

**Response:**
```json
{
  "id": "number",
  "name": "string",
  "email": "string",
  "phone": "string"
}
```

---

### Chat Endpoints

#### POST /api/chat/message
Send a message to the chatbot and get a response.

**Request:**
```json
{
  "session_id": "string",
  "patient_id": "number",
  "message": "string"
}
```

**Response:**
```json
{
  "session_id": "string",
  "response": "string",
  "action": {
    "type": "schedule" | "cancel" | "reschedule" | null,
    "data": "object | null"
  }
}
```

#### GET /api/chat/history/:sessionId
Get conversation history for a session.

**Response:**
```json
{
  "session_id": "string",
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "timestamp": "ISO8601 datetime"
    }
  ]
}
```

---

### Clinic Endpoints

#### GET /api/clinic/info
Get clinic information (hours, location, contact).

**Response:**
```json
{
  "name": "string",
  "hours": "string",
  "location": "string",
  "phone": "string",
  "email": "string"
}
```

---

## Business Rules

### Appointment Scheduling
- **Duration:** 30 minutes or 60 minutes only
- **Types:** consultation, follow-up, emergency
- **Business Hours:** 8:00 AM - 5:00 PM (hardcoded for MVP)
- **Booking Window:** Same day up to 1 month in advance
- **Gap Between Appointments:** None (back-to-back allowed)
- **Conflict Prevention:** Time slots locked during booking process

### Doctor Availability
- **Working Hours:** 8:00 AM - 5:00 PM (hardcoded for MVP)
- **Days:** Monday-Friday (assumed for MVP)

### Cancellation/Rescheduling
- No time restrictions for MVP
- Patients can cancel/reschedule through chat
- Doctor cancellations deferred for future

---

## LLM Integration (Anthropic Claude)

### Function/Tool Definitions

The chatbot will have access to the following tools:

1. **check_availability**
   - Input: doctor_id, date, duration
   - Output: Available time slots

2. **schedule_appointment**
   - Input: doctor_id, patient_id, start_time, end_time, type, summary
   - Output: Confirmation with appointment details

3. **cancel_appointment**
   - Input: appointment_id
   - Output: Cancellation confirmation

4. **reschedule_appointment**
   - Input: appointment_id, new_start_time, new_end_time
   - Output: Reschedule confirmation

5. **get_clinic_info**
   - Input: None
   - Output: Clinic details (hours, location, contact)

6. **list_doctors**
   - Input: specialty (optional)
   - Output: List of doctors

### System Prompt
```
You are a helpful medical scheduling assistant for [Clinic Name]. Your role is to:
1. Answer questions about the clinic (hours, location, services)
2. Help patients find the right doctor based on their needs
3. Check doctor availability and schedule appointments
4. Modify or cancel existing appointments
5. Provide a friendly, professional experience

Clinic hours: 8:00 AM - 5:00 PM, Monday-Friday
Appointment durations: 30 or 60 minutes
Appointment types: consultation, follow-up, emergency

When scheduling, always:
- Confirm the doctor's specialty matches the patient's needs
- Check availability before proposing times
- Summarize appointment details for confirmation
- Capture key information about the visit reason for the doctor
```

---

## Authentication (MVP Implementation)

### Hardcoded Test Users

**Patients:**
```javascript
[
  { id: 1, name: "John Doe", email: "john@example.com", phone: "555-0101", password: "patient123" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "555-0102", password: "patient123" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", phone: "555-0103", password: "patient123" }
]
```

**Doctors:**
```javascript
[
  { id: 1, name: "Dr. Sarah Williams", specialty: "Cardiologist", email: "sarah@clinic.com", password: "doctor123" },
  { id: 2, name: "Dr. Michael Chen", specialty: "Dermatologist", email: "michael@clinic.com", password: "doctor123" },
  { id: 3, name: "Dr. Emily Rodriguez", specialty: "General Practitioner", email: "emily@clinic.com", password: "doctor123" }
]
```

### Simple Login Switcher
- Frontend dropdown to select user type (Patient/Doctor) and username
- Simple JWT token generation for session management
- No password hashing required for MVP (just string comparison)

---

## Frontend Components

### Patient Chat Interface
```
ChatPage
├── ChatHeader (clinic name, logout)
├── MessageList (conversation history)
├── MessageInput (text input + send button)
└── TypingIndicator
```

### Doctor Dashboard
```
DashboardPage
├── DashboardHeader (doctor name, logout)
├── CalendarView (react-big-calendar)
│   └── AppointmentEvent (shows patient, time, type)
└── AppointmentDetailsModal (shows full appointment info)
```

### Shared Components
```
LoginPage (simple user selector for MVP)
```

---

## Implementation Plan

### Phase 1: Project Setup
- [ ] Initialize React project (Vite or Create React App)
- [ ] Initialize Express server
- [ ] Setup project structure (frontend/backend folders)
- [ ] Install dependencies

### Phase 2: Database Setup
- [ ] Configure SQLite with schema
- [ ] Setup MongoDB connection
- [ ] Create database seed script with hardcoded users and clinic info
- [ ] Test database connections

### Phase 3: Backend API Development
- [ ] Setup Express routes structure
- [ ] Implement authentication endpoints (simple JWT)
- [ ] Implement scheduling endpoints
- [ ] Implement doctor endpoints
- [ ] Implement patient endpoints
- [ ] Implement clinic info endpoints
- [ ] Add error handling and validation

### Phase 4: LLM Integration
- [ ] Setup Anthropic Claude SDK
- [ ] Define tool/function schemas
- [ ] Implement chat endpoint with tool calling
- [ ] Implement conversation persistence to MongoDB
- [ ] Test chatbot responses and tool execution

### Phase 5: Frontend - Patient Chat ✅
- [x] Create login page with user switcher
- [x] Build chat interface UI
- [x] Implement message sending/receiving
- [x] Display conversation history
- [x] Handle tool call responses (confirmations, etc.)
- [x] Add loading states

### Phase 6: Frontend - Doctor Dashboard
- [ ] Create doctor login flow
- [ ] Integrate react-big-calendar
- [ ] Fetch and display appointments
- [ ] Implement calendar navigation (week/month views)
- [ ] Create appointment detail modal
- [ ] Add filtering capabilities

### Phase 7: Integration & Testing
- [ ] End-to-end testing of booking flow
- [ ] Test cancellation and rescheduling
- [ ] Test conflict prevention
- [ ] Test multiple doctor scenarios
- [ ] Fix bugs and edge cases

### Phase 8: Documentation & Deployment
- [ ] Add README with setup instructions
- [ ] Document environment variables
- [ ] Test local deployment
- [ ] Create demo script

---

## Environment Variables

```bash
# Backend (.env)
PORT=3000
ANTHROPIC_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/doctor-portal
SQLITE_DB_PATH=./database.sqlite

# Frontend (.env)
VITE_API_URL=http://localhost:3000/api
```

---

## Deferred Features (Post-MVP)

- Email/SMS notifications for appointments
- Payment processing
- Complex doctor scheduling rules (vacation, custom hours)
- Patient medical history
- Multiple clinic locations
- Doctor ability to set their own availability
- Doctor notes on appointments
- Patient profiles with medical information
- Appointment reminders
- Video consultation integration
- Analytics and reporting
- Advanced search and filtering
- Patient cancellation policies (24hr notice, etc.)

---

## Security Considerations (MVP vs Production)

**MVP (Acceptable for local dev):**
- Hardcoded passwords
- Simple JWT without refresh tokens
- No rate limiting
- Basic input validation

**Production (Required before deployment):**
- Proper password hashing (bcrypt)
- Secure JWT implementation with refresh tokens
- Rate limiting on API endpoints
- Comprehensive input validation and sanitization
- HTTPS only
- CORS configuration
- SQL injection prevention (parameterized queries)
- NoSQL injection prevention
- HIPAA compliance considerations for patient data

---

## Success Metrics

### MVP Goals
- [ ] Patient can successfully book an appointment through chat
- [ ] Doctor can view their appointments in calendar
- [ ] No double-booking occurs
- [ ] Conversation history persists across sessions
- [ ] Chatbot can answer basic clinic questions

---

## Notes

- All times stored in UTC in database, converted to local timezone in frontend
- Session management: Generate new session_id for each login or page refresh
- Calendar should show appointments in 30-minute increments
- Conversation summaries should be concise (max 200 characters for display)

---

## Questions/Decisions Log

1. **Q:** Should patients authenticate before chatting?  
   **A:** Yes, simple hardcoded login required.

2. **Q:** How to handle appointment durations?  
   **A:** Fixed options: 30 or 60 minutes only.

3. **Q:** Database choice for conversations?  
   **A:** MongoDB for flexibility with message arrays.

4. **Q:** Doctor availability management?  
   **A:** Hardcoded 8-5 for MVP, defer custom scheduling.

5. **Q:** LLM provider?  
   **A:** Anthropic Claude with function calling.

---

## Contact & Resources

- **Anthropic Claude API Docs:** https://docs.anthropic.com/
- **react-big-calendar:** https://github.com/jquense/react-big-calendar
- **SQLite:** https://www.sqlite.org/docs.html
- **MongoDB:** https://docs.mongodb.com/

---

**Last Updated:** December 11, 2025
