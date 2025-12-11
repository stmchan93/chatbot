import express from 'express';
import { getClinicInfo } from '../controllers/clinicController.js';

const router = express.Router();

// Public route
router.get('/info', getClinicInfo);

export default router;
