import { Router } from 'express';
import { index, show, store, update, destroy, preview, serveFile, sendEmailSurat } from '../controllers/suratController';
import { incomingMonthlyPdf, incomingExport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import upload from '../config/upload';

const router = Router();

// All routes are protected
router.use(authenticate);

router.get('/', index);
// Static sub-resource routes must come BEFORE /:id to avoid ambiguity
router.get('/monthly-pdf', incomingMonthlyPdf as any);
router.get('/export',      incomingExport as any);
router.get('/:id/file', serveFile);
router.get('/:id/preview/:filename?', preview);
router.get('/:id', show);
router.post('/', upload.single('file_surat'), store);
router.post('/:id/send-email', sendEmailSurat);
router.put('/:id', upload.single('file_surat'), update);
router.post('/:id', upload.single('file_surat'), update); // POST alias for file uploads
router.delete('/:id', destroy);

export default router;
