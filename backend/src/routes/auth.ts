import { Router } from 'express';
import { register, login, logout, getProfile, forgotPassword, resetPassword, verifyPassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-password', verifyPassword);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);

export default router;
