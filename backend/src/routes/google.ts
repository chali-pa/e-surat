import { Router } from 'express';
import { 
  redirect, 
  callback, 
  status, 
  disconnect, 
  debug, 
  provision,
  listFolders,
  getFolder,
  getStorageSettingsHandler,
  updateStorageSettingsHandler,
  listSpreadsheets,
  createSpreadsheet,
  renameSpreadsheet,
  trashSpreadsheet,
  assignSpreadsheet
} from '../controllers/googleController';
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

// Folder browser & storage destination routes
router.get('/folders', listFolders);
router.get('/folders/:id', getFolder);
router.get('/storage-settings', getStorageSettingsHandler);
router.put('/storage-settings', updateStorageSettingsHandler);

// Spreadsheet CRUD routes
router.get('/spreadsheets', listSpreadsheets);
router.post('/spreadsheets', createSpreadsheet);
router.put('/spreadsheets/:id', renameSpreadsheet);
router.delete('/spreadsheets/:id', trashSpreadsheet);
router.put('/spreadsheets/:id/assign', assignSpreadsheet);

export default router;
