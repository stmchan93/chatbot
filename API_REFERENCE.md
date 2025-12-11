# Doctor Portal - API Reference

**Base URL:** `http://localhost:3000/api`

---

## Authentication

### POST `/auth/login`
Login for patients or doctors.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "patient123",
  "role": "patient" // or "doctor"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-0101",
    "role": "patient"
  }
}
```

**Errors:**
- `400` - Missing fields or invalid role
- `401` - Invalid credentials

---

## Doctors

### GET `/doctors`
Get list of all doctors (public).

**Query Parameters:**
- `specialty` (optional) - Filter by specialty

**Response (200):**
```json
{
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Sarah Williams",
      "specialty": "Cardiologist",
      "email": "sarah@clinic.com"
    }
  ]
}
```

### GET `/doctors/:doctorId/appointments`
Get appointments for a specific doctor (doctors only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` (optional) - Filter from date (YYYY-MM-DD)
- `end_date` (optional) - Filter to date (YYYY-MM-DD)
- `view` (optional) - "week" | "month" | "year"

**Response (200):**
```json
{
  "appointments": [
    {
      "id": 1,
      "start_time": "2025-12-12T10:00:00.000Z",
      "end_time": "2025-12-12T10:30:00.000Z",
      "type": "consultation",
      "status": "scheduled",
      "conversation_summary": "Patient has chest pain...",
      "patient_name": "John Doe",
      "patient_email": "john@example.com",
      "patient_phone": "555-0101"
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not a doctor

---

## Appointments

### GET `/appointments/availability`
Check available time slots for a doctor (public).

**Query Parameters:**
- `doctor_id` (required) - Doctor ID
- `date` (required) - Date in YYYY-MM-DD format
- `duration` (required) - 30 or 60 (minutes)

**Response (200):**
```json
{
  "doctor_id": 1,
  "date": "2025-12-12",
  "duration": 30,
  "available_slots": [
    {
      "start_time": "2025-12-12T08:00:00.000Z",
      "end_time": "2025-12-12T08:30:00.000Z"
    },
    {
      "start_time": "2025-12-12T08:30:00.000Z",
      "end_time": "2025-12-12T09:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `400` - Missing parameters or invalid duration

---

### POST `/appointments/schedule`
Schedule a new appointment (patients only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "doctor_id": 1,
  "start_time": "2025-12-12T10:00:00.000Z",
  "end_time": "2025-12-12T10:30:00.000Z",
  "type": "consultation", // or "follow-up", "emergency"
  "conversation_summary": "Patient needs cardiologist consultation for chest pain"
}
```

**Response (201):**
```json
{
  "id": 1,
  "patient_id": 1,
  "doctor_id": 1,
  "start_time": "2025-12-12T10:00:00.000Z",
  "end_time": "2025-12-12T10:30:00.000Z",
  "type": "consultation",
  "conversation_summary": "Patient needs cardiologist...",
  "status": "scheduled",
  "created_at": "2025-12-11T22:00:00.000Z"
}
```

**Errors:**
- `400` - Missing fields or invalid type
- `401` - Not authenticated
- `403` - Not a patient
- `409` - Time slot conflict (already booked)

---

### DELETE `/appointments/:id/cancel`
Cancel an appointment.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Appointment cancelled successfully",
  "id": 1
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized (not your appointment)
- `404` - Appointment not found

---

### PUT `/appointments/:id/reschedule`
Reschedule an existing appointment.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "start_time": "2025-12-12T14:00:00.000Z",
  "end_time": "2025-12-12T14:30:00.000Z"
}
```

**Response (200):**
```json
{
  "id": 1,
  "patient_id": 1,
  "doctor_id": 1,
  "start_time": "2025-12-12T14:00:00.000Z",
  "end_time": "2025-12-12T14:30:00.000Z",
  "type": "consultation",
  "status": "scheduled",
  "created_at": "2025-12-11T22:00:00.000Z"
}
```

**Errors:**
- `400` - Missing fields
- `401` - Not authenticated
- `403` - Not authorized (not your appointment)
- `404` - Appointment not found
- `409` - Time slot conflict

---

## Clinic

### GET `/clinic/info`
Get clinic information (public).

**Response (200):**
```json
{
  "name": "HealthCare Plus Medical Center",
  "hours": "Monday-Friday: 8:00 AM - 5:00 PM",
  "location": "123 Medical Plaza, Suite 100, San Francisco, CA 94102",
  "phone": "(555) 123-4567",
  "email": "info@healthcareplus.com"
}
```

---

## Test Credentials

### Patients
```
Email: john@example.com
Password: patient123

Email: jane@example.com
Password: patient123

Email: bob@example.com
Password: patient123
```

### Doctors
```
Email: sarah@clinic.com (Cardiologist)
Password: doctor123

Email: michael@clinic.com (Dermatologist)
Password: doctor123

Email: emily@clinic.com (General Practitioner)
Password: doctor123
```

---

## Business Rules

- **Business Hours:** 8:00 AM - 5:00 PM
- **Appointment Durations:** 30 or 60 minutes only
- **Appointment Types:** consultation, follow-up, emergency
- **Booking Window:** Same day up to 1 month in advance
- **No double-booking:** System prevents scheduling conflicts
- **No gaps required:** Back-to-back appointments allowed

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., double booking)
- `500` - Internal Server Error
