/**
 * reportService.ts
 *
 * Server-side report generation:
 *   - Monthly summary PDF (pdf-lib, tabular layout)
 *   - Spreadsheet export  (exceljs, .xlsx)
 *
 * Both functions are pure: they receive the data rows and return a Buffer.
 * No Drive upload, no DB writes — callers stream the Buffer directly to
 * the HTTP response.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';

// ─── shared types ──────────────────────────────────────────────────────────

export interface IncomingMailRow {
  id?: number;
  nomor_surat: string;
  nama_pengirim: string;
  nama_surat: string;
  tanggal_masuk: string;
  tanggal_buat: string;
  folder_name?: string | null;
  created_at?: string;
}

export interface OutgoingMailRow {
  id?: number;
  nomor_surat: string;
  nama_penerima: string;
  nama_surat: string;
  tanggal_keluar: string;
  tanggal_buat: string;
  folder_name?: string | null;
  created_at?: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────

/** Indonesian month names, 1-based index. */
const ID_MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function monthLabel(month: number, year: number): string {
  return `${ID_MONTHS[month] ?? month} ${year}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Clip a string to maxLen characters, appending '…' if truncated. */
function clip(str: string | undefined | null, maxLen: number): string {
  if (!str) return '-';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/** Draw a horizontal rule on a pdf-lib page at y. Returns the new y. */
function drawHR(page: any, y: number, color: any, width: number): number {
  page.drawLine({
    start: { x: 40, y },
    end:   { x: width - 40, y },
    thickness: 0.5,
    color,
  });
  return y - 4;
}

// ─── PDF generation ────────────────────────────────────────────────────────

/**
 * Generate a monthly summary PDF for incoming letters.
 * Returns a Buffer that can be piped directly to the HTTP response.
 */
export async function generateIncomingMonthlyPdf(
  rows: IncomingMailRow[],
  month: number,
  year: number
): Promise<Buffer> {
  const title   = `Laporan Surat Masuk — ${monthLabel(month, year)}`;
  return buildSummaryPdf(title, rows.length, rows.map((r, i) => [
    String(i + 1),
    clip(r.nomor_surat, 24),
    formatDate(r.tanggal_masuk),
    clip(r.nama_pengirim, 28),
    clip(r.nama_surat, 36),
    clip(r.folder_name ?? 'Default', 20),
  ]), ['No', 'Nomor Surat', 'Tgl Masuk', 'Pengirim', 'Perihal', 'Folder']);
}

/**
 * Generate a monthly summary PDF for outgoing letters.
 */
export async function generateOutgoingMonthlyPdf(
  rows: OutgoingMailRow[],
  month: number,
  year: number
): Promise<Buffer> {
  const title = `Laporan Surat Keluar — ${monthLabel(month, year)}`;
  return buildSummaryPdf(title, rows.length, rows.map((r, i) => [
    String(i + 1),
    clip(r.nomor_surat, 24),
    formatDate(r.tanggal_keluar),
    clip(r.nama_penerima, 28),
    clip(r.nama_surat, 36),
    clip(r.folder_name ?? 'Default', 20),
  ]), ['No', 'Nomor Surat', 'Tgl Keluar', 'Penerima', 'Perihal', 'Folder']);
}

/**
 * Core tabular PDF builder used by both incoming and outgoing generators.
 * A4 landscape orientation, 6 columns.
 */
async function buildSummaryPdf(
  title: string,
  totalCount: number,
  dataRows: string[][],
  headers: string[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font      = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 landscape
  const PAGE_W = 841.89;
  const PAGE_H = 595.28;
  const MARGIN  = 40;
  const USABLE  = PAGE_W - MARGIN * 2;

  // Column widths (sum = USABLE)
  const COL_W = [28, 108, 76, 108, 190, 80];
  const ROW_H  = 18;
  const HEAD_H = 22;
  const FONT_SZ = 8;

  const grey    = rgb(0.94, 0.92, 0.97);
  const purple  = rgb(0.294, 0.086, 0.298);
  const black   = rgb(0, 0, 0);
  const mid     = rgb(0.4, 0.4, 0.4);
  const white   = rgb(1, 1, 1);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ── Title block ────────────────────────────────────────────────────────
  page.drawText(title, {
    x: MARGIN, y,
    size: 14, font: fontBold, color: purple,
  });
  y -= 18;

  const generatedLine = `Dibuat: ${new Date().toLocaleString('id-ID')}   Total: ${totalCount} surat`;
  page.drawText(generatedLine, { x: MARGIN, y, size: 8, font, color: mid });
  y -= 6;
  y = drawHR(page, y, purple, PAGE_W);
  y -= 8;

  const drawHeader = () => {
    let cx = MARGIN;
    // Header background
    page.drawRectangle({ x: MARGIN, y: y - HEAD_H + 4, width: USABLE, height: HEAD_H, color: purple });
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: cx + 3, y: y - 12,
        size: FONT_SZ, font: fontBold, color: white,
        maxWidth: COL_W[i] - 4,
      });
      cx += COL_W[i];
    });
    y -= HEAD_H;
  };

  drawHeader();

  // ── Data rows ──────────────────────────────────────────────────────────
  dataRows.forEach((cells, rowIdx) => {
    // New page if needed (leave room for 1 row + small footer)
    if (y < MARGIN + ROW_H + 16) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawHeader();
    }

    const bg = rowIdx % 2 === 0 ? white : grey;
    page.drawRectangle({ x: MARGIN, y: y - ROW_H + 4, width: USABLE, height: ROW_H, color: bg });

    let cx = MARGIN;
    cells.forEach((cell, i) => {
      page.drawText(cell, {
        x: cx + 3, y: y - 11,
        size: FONT_SZ, font,
        color: i === 1 ? purple : black,
        maxWidth: COL_W[i] - 6,
      });
      cx += COL_W[i];
    });
    y -= ROW_H;
  });

  // ── Footer on last page ────────────────────────────────────────────────
  drawHR(page, y - 4, mid, PAGE_W);
  page.drawText(`E-Surat — ${title}`, {
    x: MARGIN, y: y - 18,
    size: 7, font, color: mid,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── Excel export ──────────────────────────────────────────────────────────

/**
 * Generate an xlsx workbook for incoming mail records.
 * Returns a Buffer that can be piped directly to the HTTP response.
 */
export async function generateIncomingExport(rows: IncomingMailRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'E-Surat';
  wb.created = new Date();

  const ws = wb.addWorksheet('Surat Masuk');

  // Column definitions
  ws.columns = [
    { header: 'No',           key: 'no',           width: 5  },
    { header: 'Nomor Surat',  key: 'nomor_surat',  width: 24 },
    { header: 'Pengirim',     key: 'nama_pengirim', width: 28 },
    { header: 'Perihal',      key: 'nama_surat',   width: 40 },
    { header: 'Tgl Masuk',    key: 'tanggal_masuk', width: 16 },
    { header: 'Tgl Buat',     key: 'tanggal_buat', width: 16 },
    { header: 'Folder',       key: 'folder_name',  width: 22 },
    { header: 'Dicatat Pada', key: 'created_at',   width: 24 },
  ];

  // Style the header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B164C' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  rows.forEach((r, i) => {
    ws.addRow({
      no:           i + 1,
      nomor_surat:  r.nomor_surat,
      nama_pengirim: r.nama_pengirim,
      nama_surat:   r.nama_surat,
      tanggal_masuk: r.tanggal_masuk ? formatDate(r.tanggal_masuk) : '-',
      tanggal_buat: r.tanggal_buat  ? formatDate(r.tanggal_buat)  : '-',
      folder_name:  r.folder_name ?? 'Default',
      created_at:   r.created_at
        ? new Date(r.created_at).toLocaleString('id-ID')
        : '-',
    });
  });

  // Auto-filter on header row
  ws.autoFilter = { from: 'A1', to: 'H1' };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
