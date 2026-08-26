/**
 * reportController.ts
 *
 * Routes:
 *   GET  /api/surat/monthly-pdf         — incoming monthly summary PDF
 *   GET  /api/surat-keluar/monthly-pdf  — outgoing monthly summary PDF
 *   GET  /api/surat/export              — incoming xlsx export
 *
 * Query params for monthly-pdf and export:
 *   ?month=current          — server-clock current month
 *   ?year=2026&month=8      — explicit month (1-based)
 *   (omitted)               — all records (export only; pdf requires a month)
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getAllIncomingLetterRecords,
  getIncomingLetterRecordsByMonth,
  getAllOutgoingLetterRecords,
  getOutgoingLetterRecordsByMonth,
} from '../models/Surat';
import { findFoldersByUser } from '../models/Folder';
import {
  generateIncomingMonthlyPdf,
  generateOutgoingMonthlyPdf,
  generateIncomingExport,
} from '../services/reportService';
import { isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';

// ─── helpers ───────────────────────────────────────────────────────────────

/** Resolve year/month from query params, defaulting to server clock for "current". */
function resolveMonthFilter(
  monthParam?: string,
  yearParam?: string
): { year: number; month: number } | null {
  if (monthParam === 'current') {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  if (monthParam && yearParam) {
    const y = parseInt(yearParam, 10);
    const m = parseInt(monthParam, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }
  return null;
}

/** Build a folder id→name map for one user (non-fatal if it fails). */
async function buildFolderMap(userId: number): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  try {
    const folders = await findFoldersByUser(userId);
    for (const f of folders) {
      if (f.id !== undefined) map[f.id] = f.name;
    }
  } catch {
    // Non-fatal
  }
  return map;
}

// ─── Incoming monthly PDF ──────────────────────────────────────────────────

export const incomingMonthlyPdf = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const filter = resolveMonthFilter(
    req.query.month as string | undefined,
    req.query.year  as string | undefined
  );

  if (!filter) {
    return res.status(400).json({
      error: 'Month filter required. Use ?month=current or ?year=YYYY&month=M',
    });
  }

  try {
    const records = await getIncomingLetterRecordsByMonth(userId, filter.year, filter.month);
    const folderMap = await buildFolderMap(userId);
    const enriched = records.map((r) => ({
      ...r,
      folder_name: r.folder_id ? (folderMap[r.folder_id] ?? null) : null,
    }));

    if (enriched.length === 0) {
      return res.status(404).json({
        error: 'No records',
        message: 'Tidak ada surat masuk untuk bulan tersebut.',
      });
    }

    const pdfBuffer = await generateIncomingMonthlyPdf(enriched, filter.month, filter.year);
    const filename  = `surat-masuk-${String(filter.month).padStart(2, '0')}-${filter.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[ReportController] Incoming monthly PDF error:', err);
    if (isGoogleErrorInvalidGrant(err)) {
      return res.status(401).json({ error_code: 'GOOGLE_RECONNECT_REQUIRED', error: 'Koneksi Google perlu diperbarui' });
    }
    res.status(500).json({ error: 'Failed to generate PDF', message: err?.message || String(err) });
  }
};

// ─── Outgoing monthly PDF ──────────────────────────────────────────────────

export const outgoingMonthlyPdf = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const filter = resolveMonthFilter(
    req.query.month as string | undefined,
    req.query.year  as string | undefined
  );

  if (!filter) {
    return res.status(400).json({
      error: 'Month filter required. Use ?month=current or ?year=YYYY&month=M',
    });
  }

  try {
    const records = await getOutgoingLetterRecordsByMonth(userId, filter.year, filter.month);
    const folderMap = await buildFolderMap(userId);
    const enriched = records.map((r) => ({
      ...r,
      folder_name: r.folder_id ? (folderMap[r.folder_id] ?? null) : null,
    }));

    if (enriched.length === 0) {
      return res.status(404).json({
        error: 'No records',
        message: 'Tidak ada surat keluar untuk bulan tersebut.',
      });
    }

    const pdfBuffer = await generateOutgoingMonthlyPdf(enriched, filter.month, filter.year);
    const filename  = `surat-keluar-${String(filter.month).padStart(2, '0')}-${filter.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[ReportController] Outgoing monthly PDF error:', err);
    if (isGoogleErrorInvalidGrant(err)) {
      return res.status(401).json({ error_code: 'GOOGLE_RECONNECT_REQUIRED', error: 'Koneksi Google perlu diperbarui' });
    }
    res.status(500).json({ error: 'Failed to generate PDF', message: err?.message || String(err) });
  }
};

// ─── Incoming xlsx export ──────────────────────────────────────────────────

export const incomingExport = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const filter = resolveMonthFilter(
    req.query.month as string | undefined,
    req.query.year  as string | undefined
  );

  try {
    let records;
    if (filter) {
      records = await getIncomingLetterRecordsByMonth(userId, filter.year, filter.month);
    } else {
      records = await getAllIncomingLetterRecords(userId);
    }

    const folderMap = await buildFolderMap(userId);
    const enriched = records.map((r) => ({
      ...r,
      folder_name: r.folder_id ? (folderMap[r.folder_id] ?? null) : null,
    }));

    if (enriched.length === 0) {
      return res.status(404).json({
        error: 'No records',
        message: 'Tidak ada data surat masuk untuk diekspor.',
      });
    }

    const xlsxBuffer = await generateIncomingExport(enriched);
    const suffix   = filter
      ? `${String(filter.month).padStart(2, '0')}-${filter.year}`
      : 'semua';
    const filename = `surat-masuk-${suffix}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', String(xlsxBuffer.length));
    res.send(xlsxBuffer);
  } catch (err: any) {
    console.error('[ReportController] Incoming export error:', err);
    res.status(500).json({ error: 'Failed to generate export', message: err?.message || String(err) });
  }
};
