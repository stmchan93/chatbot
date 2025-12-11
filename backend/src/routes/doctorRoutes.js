import express from 'express';
import { getAllDoctors, getDoctorAppointments } from '../controllers/doctorController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public route - anyone can see list of doctors
router.get('/', getAllDoctors);

// Protected route - only doctors can view appointments
router.get(
  '/:doctorId/appointments',
  authenticateToken,
  requireRole('doctor'),
  getDoctorAppointments
);

export default router;
