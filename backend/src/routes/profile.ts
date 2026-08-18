import { Router } from 'express';
import { updateProfile, deleteProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

router.patch('/', updateProfile);
router.delete('/', deleteProfile);

export default router;
