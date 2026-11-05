import { Router } from 'express';
import { getFolders, createFolder, renameFolder, deleteFolder } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get folders for a specific month
router.get('/', getFolders);

// Create a new folder
router.post('/', createFolder);

// Rename a folder in Drive
router.put('/:driveId', renameFolder);

// Delete / Trash a folder in Drive
router.delete('/:driveId', deleteFolder);

export default router;