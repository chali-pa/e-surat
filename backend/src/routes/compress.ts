import { Router } from 'express';
import { compressPdf, compressPdfInfo } from '../controllers/compressController';
import { authenticate } from '../middleware/auth';
import upload from '../config/upload';

const router = Router();
router.use(authenticate);

// GET /api/compress-pdf/info — threshold constants (no file upload)
router.get('/info', compressPdfInfo as any);

// POST /api/compress-pdf — upload a PDF, receive compressed PDF back
router.post('/', upload.single('file'), compressPdf as any);

export default router;
