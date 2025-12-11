import express from 'express';
import {
  getAvailability,
  scheduleAppointment,
  cancelAppointment,
  rescheduleAppointment
} from '../controllers/appointmentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public route - check availability
router.get('/availability', getAvailability);

// Protected routes - require authentication
router.post('/schedule', authenticateToken, requireRole('patient'), scheduleAppointment);
router.delete('/:id/cancel', authenticateToken, cancelAppointment);
router.put('/:id/reschedule', authenticateToken, rescheduleAppointment);

export default router;
