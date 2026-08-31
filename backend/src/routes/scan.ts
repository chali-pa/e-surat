import { Router } from 'express';
import { handleScanStream, getScanFile, deleteScanFile } from '../controllers/scanController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protect all scanning endpoints
router.use(authenticate);

router.get('/stream', handleScanStream);
router.get('/file', getScanFile);
router.delete('/file', deleteScanFile);

export default router;
