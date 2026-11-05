import { Router } from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.patch('/', updateProfile);
router.delete('/', deleteProfile);

export default router;
