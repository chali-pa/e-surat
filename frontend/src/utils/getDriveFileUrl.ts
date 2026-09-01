/**
 * getDriveFileUrl.ts
 *
 * Resolves a Google Drive file reference — in any of the formats that may
 * appear in the `file_path` / `google_drive_id` fields — to a canonical
 * "view" URL, or returns null when the value is unresolvable.
 *
 * Formats handled:
 *  1. Full Google Drive URL  -> https://drive.google.com/file/d/{ID}/view
 *  2. open?id= URL style     -> https://drive.google.com/open?id={ID}
 *  3. Raw file ID string      -> 25+ alphanumeric / dash / underscore chars
 *  4. =HYPERLINK formula     -> =HYPERLINK("https://drive.google.com/...", "label")
 *  5. Plain display label    -> "Lihat File", "View File", etc. -> null
 *  6. Empty / malformed      -> null
 */

/**
 * A Google Drive file ID is an opaque alphanumeric string, typically 25-44
 * characters long, containing only letters, digits, dashes, and underscores.
 * We require at least 25 characters to avoid false positives on short strings
 * that might look ID-like.
 */
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{25,}$/;

/**
 * Matches a Google Drive file URL in any known variant and captures the ID.
 *
 * Supported URL patterns:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/file/d/{ID}/
 *   https://drive.google.com/open?id={ID}
 *   https://docs.google.com/...d/{ID}/...
 */
const DRIVE_URL_ID_RE =
  /https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]{25,})/;

/**
 * Matches the first URL argument inside a Google Sheets HYPERLINK formula.
 * Example:  =HYPERLINK("https://drive.google.com/file/d/ABC/view", "Lihat File")
 */
const HYPERLINK_URL_RE = /=HYPERLINK\(\s*"([^"]+)"/i;

/**
 * Known plain-text display labels that the Sheets API returns in place of the
 * real URL when the cell contains a =HYPERLINK formula and the default
 * FORMATTED_VALUE render option is used.
 */
const KNOWN_UNRESOLVABLE_LABELS = new Set([
  'lihat file',
  'view file',
  'open file',
  'buka file',
  'download',
  'unduh',
  'file',
]);

/**
 * Resolve a Google Drive file reference to a canonical view URL.
 *
 * @param value - The raw cell value from `file_path` or `google_drive_id`.
 *                May be a full URL, raw file ID, =HYPERLINK formula string,
 *                or a plain display label.
 * @returns     A canonical `https://drive.google.com/file/d/{ID}/view` URL,
 *              or `null` if the value cannot be resolved to a valid Drive link.
 */
export function getDriveFileUrl(value: string | null | undefined): string | null {
  try {
    // -- Guard: reject empty / non-string values immediately
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // -- Case 1: =HYPERLINK formula (read back via FORMULA render option)
    // Sheets returns  =HYPERLINK("https://...", "label")  when the formula
    // render option is used.  Extract the URL from the first argument.
    const hlMatch = HYPERLINK_URL_RE.exec(trimmed);
    if (hlMatch) {
      // Recurse with the extracted URL — falls into Case 2 or 3 below.
      return getDriveFileUrl(hlMatch[1]);
    }

    // -- Case 2: Full Google Drive / Docs URL
    // Extract the file ID and return a normalized /file/d/{ID}/view URL.
    const urlMatch = DRIVE_URL_ID_RE.exec(trimmed);
    if (urlMatch) {
      return `https://drive.google.com/file/d/${urlMatch[1]}/view`;
    }

    // -- Case 3: Plain HTTP URL that is not a recognised Drive URL
    // Accept it as-is (e.g. a direct download link) rather than guessing.
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // -- Case 4: Raw Google Drive file ID
    if (DRIVE_ID_RE.test(trimmed)) {
      return `https://drive.google.com/file/d/${trimmed}/view`;
    }

    // -- Case 5: Known display label (FORMATTED_VALUE sheet readback)
    // These are returned by the Sheets API when the cell contains
    // =HYPERLINK(..., "Lihat File") and we read with FORMATTED_VALUE.
    if (KNOWN_UNRESOLVABLE_LABELS.has(trimmed.toLowerCase())) {
      return null;
    }

    // -- Case 6: Any other plain string (filename, path, etc.)
    // We have no mapping; return null rather than guessing.
    return null;
  } catch {
    // Never propagate — one bad cell must not crash the whole table render.
    return null;
  }
}

/**
 * Helper: Given a surat object (with optional google_drive_id and file_path),
 * return the best available Google Drive URL, or null.
 *
 * Priority:
 *  1. google_drive_id  -> most reliable; stored as a raw ID in column G
 *  2. file_path        -> may be a URL, raw ID, formula, or label
 */
export function getSuratDriveUrl(surat: {
  google_drive_id?: string | null;
  file_path?: string | null;
}): string | null {
  // Prefer the raw Drive ID stored in column G — it is never a formula.
  if (surat.google_drive_id) {
    const fromId = getDriveFileUrl(surat.google_drive_id);
    if (fromId) return fromId;
  }
  // Fall back to file_path (may be a URL, formula, or label).
  if (surat.file_path) {
    return getDriveFileUrl(surat.file_path);
  }
  return null;
}
