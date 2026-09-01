import { describe, it, expect } from 'vitest';
import { getDriveFileUrl, getSuratDriveUrl } from './getDriveFileUrl';

// ─── getDriveFileUrl ────────────────────────────────────────────────────────

describe('getDriveFileUrl', () => {
  // 1. Full Google Drive view URL — return as normalised canonical URL
  it('accepts a full drive.google.com/file/d/ URL and normalises it', () => {
    const input = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing';
    const result = getDriveFileUrl(input);
    expect(result).toBe('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view');
  });

  // 2. open?id= URL variant
  it('accepts a drive.google.com/open?id= URL and normalises it', () => {
    const input = 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
    expect(getDriveFileUrl(input)).toBe('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view');
  });

  // 3. Raw file ID (25+ chars alphanumeric/_/-)
  it('resolves a raw Google Drive file ID to a canonical view URL', () => {
    const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
    expect(getDriveFileUrl(rawId)).toBe(`https://drive.google.com/file/d/${rawId}/view`);
  });

  // 4. =HYPERLINK formula string (read back via FORMULA render option)
  it('extracts the URL from a =HYPERLINK formula and normalises it', () => {
    const formula = '=HYPERLINK("https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view","Lihat File")';
    expect(getDriveFileUrl(formula)).toBe('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view');
  });

  // 5. Known display label "Lihat File" — the FORMATTED_VALUE readback bug
  it('returns null for the "Lihat File" display label (Sheets FORMATTED_VALUE bug)', () => {
    expect(getDriveFileUrl('Lihat File')).toBeNull();
  });

  it('returns null for "View File" label (case-insensitive)', () => {
    expect(getDriveFileUrl('VIEW FILE')).toBeNull();
  });

  // 6. Plain file name — no ID available, must not guess
  it('returns null for a plain file name with no Drive ID', () => {
    expect(getDriveFileUrl('surat_masuk_2024.pdf')).toBeNull();
  });

  // 7. Empty / null / undefined values
  it('returns null for empty string', () => {
    expect(getDriveFileUrl('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(getDriveFileUrl(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(getDriveFileUrl(undefined)).toBeNull();
  });

  // 8. Whitespace-only string
  it('returns null for whitespace-only string', () => {
    expect(getDriveFileUrl('   ')).toBeNull();
  });

  // 9. Malformed / garbage string
  it('returns null for a random malformed string', () => {
    expect(getDriveFileUrl('not-a-url-or-id!!')).toBeNull();
  });

  // 10. Short alphanumeric string that looks like an ID but is too short
  it('returns null for a string shorter than 25 chars that looks like an ID', () => {
    expect(getDriveFileUrl('ABC123xyz')).toBeNull();
  });

  // 11. Non-Drive http URL is returned as-is
  it('returns a non-Drive HTTP URL as-is', () => {
    const url = 'https://example.com/document.pdf';
    expect(getDriveFileUrl(url)).toBe(url);
  });
});

// ─── getSuratDriveUrl ───────────────────────────────────────────────────────

describe('getSuratDriveUrl', () => {
  const RAW_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
  const CANONICAL = `https://drive.google.com/file/d/${RAW_ID}/view`;

  it('prefers google_drive_id over file_path', () => {
    expect(getSuratDriveUrl({ google_drive_id: RAW_ID, file_path: 'Lihat File' })).toBe(CANONICAL);
  });

  it('falls back to file_path when google_drive_id is empty', () => {
    expect(getSuratDriveUrl({ google_drive_id: '', file_path: CANONICAL })).toBe(CANONICAL);
  });

  it('resolves file_path HYPERLINK formula when google_drive_id is missing', () => {
    const formula = `=HYPERLINK("${CANONICAL}","Lihat File")`;
    expect(getSuratDriveUrl({ google_drive_id: '', file_path: formula })).toBe(CANONICAL);
  });

  it('returns null when both google_drive_id and file_path are "Lihat File"', () => {
    expect(getSuratDriveUrl({ google_drive_id: 'Lihat File', file_path: 'Lihat File' })).toBeNull();
  });

  it('returns null when both fields are empty', () => {
    expect(getSuratDriveUrl({ google_drive_id: '', file_path: '' })).toBeNull();
  });

  it('returns null when both fields are undefined', () => {
    expect(getSuratDriveUrl({})).toBeNull();
  });
});
