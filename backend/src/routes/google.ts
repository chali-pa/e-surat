import { Router } from 'express';
import { redirect, callback, status, disconnect, debug, provision } from '../controllers/googleController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes for OAuth flow
router.get('/connect', redirect);
router.get('/callback', callback);

// Protected routes
router.use(authenticate);
router.get('/status', status);
router.post('/provision', provision);
router.post('/disconnect', disconnect);
router.get('/debug', debug);

export default router;
