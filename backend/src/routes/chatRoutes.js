import express from 'express';
import { chat, getConversationHistory } from '../controllers/chatController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Protected routes - patients only
router.post('/message', authenticateToken, requireRole('patient'), chat);
router.get('/history/:session_id', authenticateToken, requireRole('patient'), getConversationHistory);

export default router;
