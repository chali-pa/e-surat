import { Router } from 'express';
import { getFolders, createFolder } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get folders for a specific month
router.get('/', getFolders);

// Create a new folder
router.post('/', createFolder);

export default router;