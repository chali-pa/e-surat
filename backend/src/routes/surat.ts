import { Router } from 'express';
import { index, show, store, update, destroy, preview, serveFile } from '../controllers/suratController';
import { authenticate } from '../middleware/auth';
import upload from '../config/upload';

const router = Router();

// All routes are protected
router.use(authenticate);

router.get('/', index);
// :id/file must come BEFORE :id to avoid ambiguity
router.get('/:id/file', serveFile);
router.get('/:id/preview/:filename?', preview);
router.get('/:id', show);
router.post('/', upload.single('file_surat'), store);
router.put('/:id', upload.single('file_surat'), update);
router.post('/:id', upload.single('file_surat'), update); // POST alias for file uploads
router.delete('/:id', destroy);

export default router;
