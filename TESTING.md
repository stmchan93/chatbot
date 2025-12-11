# End-to-End Integration Testing Guide

## Overview
This document provides step-by-step instructions for manually testing the Doctor Portal application's core user flows.

---

## Prerequisites

**Before testing:**
1. Backend server running: `cd backend && npm run dev`
2. Frontend server running: `cd frontend && npm run dev`
3. Databases seeded with test data
4. Browser open at: http://localhost:5173

**Test Credentials:**
- **Patient:** john@example.com / patient123
- **Doctor:** sarah@clinic.com / doctor123

---

## Test Scenario 1: Book Appointment Flow

### Goal
Verify that a patient can book an appointment through the chatbot and the doctor can see it in their calendar.

### Steps

**Part A: Patient Books Appointment**

1. **Login as Patient**
   - Navigate to http://localhost:5173/login
   - Select "Patient" from role dropdown
   - Select "John Doe (john@example.com)"
   - Enter password: `patient123`
   - Click "Login"
   - ✅ **Expected:** Redirected to `/chat`

2. **Book Appointment via Chatbot**
   - In chat interface, type: `"I need to see Dr. Sarah Williams on December 20th at 2pm for a consultation"`
   - Press Send
   - ✅ **Expected:** Chatbot responds confirming appointment is scheduled
   - ✅ **Expected:** Response includes appointment details (date, time, doctor)
   - ✅ **Expected:** Action card appears showing "Appointment Scheduled"

3. **Verify Conversation History**
   - Scroll up in chat
   - ✅ **Expected:** Previous messages are visible
   - ✅ **Expected:** Messages are in correct order (user on right, assistant on left)

**Part B: Doctor Views Appointment**

4. **Logout and Login as Doctor**
   - Click "Logout" button
   - Login with "Doctor" role
   - Select "Dr. Sarah Williams (sarah@clinic.com)"
   - Enter password: `doctor123`
   - Click "Login"
   - ✅ **Expected:** Redirected to `/dashboard`

5. **View in Calendar**
   - Look at the calendar view
   - Navigate to December 20th if needed
   - ✅ **Expected:** Appointment appears on December 20th at 2pm
   - ✅ **Expected:** Event shows "John Doe - consultation"
   - ✅ **Expected:** Event is colored blue (consultation type)

6. **View Appointment Details**
   - Click on the appointment event
   - ✅ **Expected:** Modal opens with full details
   - ✅ **Expected:** Shows patient name: John Doe
   - ✅ **Expected:** Shows patient email and phone
   - ✅ **Expected:** Shows correct date/time
   - ✅ **Expected:** Shows type: Consultation
   - ✅ **Expected:** Shows conversation summary
   - ✅ **Expected:** Shows status: Scheduled

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```


```

---

## Test Scenario 2: Cancel Appointment Flow

### Goal
Verify that a patient can cancel an appointment and the time slot becomes available for rebooking.

### Steps

**Part A: Create and Cancel Appointment**

1. **Login as Patient**
   - Login as John Doe (john@example.com / patient123)

2. **Book Initial Appointment**
   - Type: `"Book me an appointment with Dr. Sarah Williams on December 22nd at 10am"`
   - ✅ **Expected:** Chatbot confirms booking

3. **Verify Booking with Doctor**
   - Logout and login as Dr. Sarah Williams
   - ✅ **Expected:** Appointment visible in calendar on Dec 22 at 10am

4. **Cancel Appointment**
   - Logout and login back as John Doe
   - In chat (same session if possible), type: `"Cancel my appointment on December 22nd at 10am"`
   - ✅ **Expected:** Chatbot confirms cancellation
   - ✅ **Expected:** Response mentions "cancelled" or "removed"

**Part B: Verify Cancellation**

5. **Check Doctor's Calendar**
   - Logout and login as Dr. Sarah Williams
   - View December 22nd
   - ✅ **Expected:** Appointment no longer appears OR shows as cancelled

6. **Verify Slot is Available**
   - Logout and login as John Doe (or Jane Smith)
   - Try to book: `"Book me with Dr. Sarah Williams on December 22nd at 10am"`
   - ✅ **Expected:** Chatbot allows booking (slot is available)
   - ✅ **Expected:** No conflict message

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```


```

---

## Test Scenario 3: Reschedule Appointment Flow

### Goal
Verify that a patient can reschedule an appointment and the doctor sees the updated time.

### Steps

1. **Login as Patient**
   - Login as John Doe (john@example.com / patient123)

2. **Book Initial Appointment**
   - Type: `"Book me an appointment with Dr. Sarah Williams on December 23rd at 9am"`
   - ✅ **Expected:** Chatbot confirms booking at 9am

3. **Request Reschedule**
   - Type: `"Can I reschedule my appointment on December 23rd to 2pm instead?"`
   - ✅ **Expected:** Chatbot confirms reschedule
   - ✅ **Expected:** Response shows new time (2pm)

4. **Verify with Doctor**
   - Logout and login as Dr. Sarah Williams
   - Navigate to December 23rd
   - ✅ **Expected:** Appointment shows at 2pm (NOT 9am)
   - ✅ **Expected:** Still shows John Doe as patient
   - ✅ **Expected:** No appointment at 9am

5. **Click Appointment for Details**
   - ✅ **Expected:** Correct time displayed in modal
   - ✅ **Expected:** Status still "Scheduled"

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```


```

---

## Test Scenario 4: Conflict Prevention

### Goal
Verify that the system prevents double-booking and suggests alternative times.

### Steps

**Part A: Create Initial Booking**

1. **Login as First Patient**
   - Login as John Doe (john@example.com / patient123)

2. **Book Time Slot**
   - Type: `"Book me with Dr. Sarah Williams on December 24th at 11am"`
   - ✅ **Expected:** Chatbot confirms booking

3. **Verify Booking**
   - Logout and login as Dr. Sarah Williams
   - ✅ **Expected:** Appointment visible on Dec 24 at 11am

**Part B: Attempt Conflicting Booking**

4. **Login as Second Patient**
   - Logout completely
   - Login as Jane Smith (jane@example.com / patient123)

5. **Try to Book Same Slot**
   - Type: `"I need Dr. Sarah Williams on December 24th at 11am"`
   - ✅ **Expected:** Chatbot indicates slot is not available
   - ✅ **Expected:** Response contains "not available", "unavailable", "already booked", or "conflict"
   - ✅ **Expected:** Chatbot suggests alternative times

6. **Verify Alternative Times**
   - ✅ **Expected:** Suggestions are for the same day or nearby dates
   - ✅ **Expected:** Suggested times are within business hours (8am-5pm)
   - ✅ **Expected:** Suggested times are available (not already booked)

7. **Book Alternative Time**
   - Follow chatbot's suggestion and book an alternative time
   - ✅ **Expected:** Booking succeeds for the alternative time

**Part C: Verify No Double-Booking**

8. **Check Doctor's Calendar**
   - Login as Dr. Sarah Williams
   - View December 24th
   - ✅ **Expected:** Only ONE appointment at 11am (John Doe's)
   - ✅ **Expected:** Jane Smith's appointment is at different time
   - ✅ **Expected:** No overlapping appointments

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```


```

---

## Additional Test Cases

### Test 5: Multiple Appointment Types

1. Book a consultation (blue)
2. Book a follow-up (green)
3. Book an emergency (red - if applicable)
4. ✅ **Expected:** Each type shows with correct color in calendar

### Test 6: Week vs Month View

1. Login as doctor
2. View appointments in Week view
3. Switch to Month view
4. ✅ **Expected:** Same appointments visible in both views
5. ✅ **Expected:** Week view shows time slots, Month view shows all-day events

### Test 7: Business Hours Constraint

1. Try to book appointment at 7am (before business hours)
2. Try to book appointment at 6pm (after business hours)
3. ✅ **Expected:** Chatbot indicates times are outside business hours
4. ✅ **Expected:** Calendar only shows 8am-5pm range

### Test 8: Session Persistence

1. Login as patient and book appointment
2. Refresh the page
3. ✅ **Expected:** Chat history is still visible
4. ✅ **Expected:** Can continue conversation in same session

---

## Test Results Summary

| Scenario | Status | Date Tested | Tester | Notes |
|----------|--------|-------------|--------|-------|
| 1. Book Appointment | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 2. Cancel Appointment | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 3. Reschedule Appointment | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 4. Conflict Prevention | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 5. Multiple Types | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 6. Week vs Month View | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 7. Business Hours | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |
| 8. Session Persistence | ⬜ PASS / ⬜ FAIL | __________ | __________ | __________ |

---

## Known Issues

*Document any issues discovered during testing:*

1. 

2. 

3. 

---

## Testing Environment

- **Date Tested:** __________
- **Backend Version:** Phase 4 complete
- **Frontend Version:** Phase 6 complete
- **Node Version:** __________
- **Browser:** __________
- **OS:** __________

---

## Next Steps

After completing these tests:

1. Document all failures in Issues section
2. Create bug tickets for each failure
3. Re-test after fixes are implemented
4. Update this document with any new test cases discovered
