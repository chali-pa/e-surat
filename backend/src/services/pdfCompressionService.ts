/**
 * pdfCompressionService.ts
 *
 * Genuine PDF compression for uploaded letters and standalone PDF compressor.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THRESHOLD NOTE
 * ──────────────────────────────────────────────────────────────────────────
 * PDF_COMPRESS_TRIGGER_BYTES — files AT OR ABOVE this size are
 *   automatically compressed before being stored in Google Drive.
 *   Default: 8 MB.
 *
 * PDF_COMPRESS_MAX_BYTES — retained for backward compatibility with endpoints.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * SERVERLESS COMPATIBILITY & DEPLOYMENT ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────────────
 * Uses `pdf-lib` + `sharp` (pure JS + platform-native node bindings).
 * Tested & confirmed fully compatible with Vercel Serverless Functions.
 *
 * How it works:
 *  1. Parses PDF structure with `pdf-lib`.
 *  2. Traverses all embedded image streams (`/Subtype /Image`).
 *  3. Downsamples high-resolution images (max dimension ~1400px) and re-encodes
 *     them as optimized JPEGs using `sharp`.
 *  4. Updates PDF stream dictionary metadata (`/Filter`, `/Width`, `/Height`, `/Length`).
 *  5. Re-saves structural PDF objects using `useObjectStreams: true`.
 *  6. Verifies PDF integrity by re-loading the output document before returning.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFArray } from 'pdf-lib';
import sharp from 'sharp';
import zlib from 'zlib';

/** Files at or above this size trigger automatic compression in mail upload (in bytes). */
export const PDF_COMPRESS_TRIGGER_BYTES = 8 * 1024 * 1024; // 8 MB

/** Retained for backward compatibility */
export const PDF_COMPRESS_MAX_BYTES = Infinity;

export interface CompressionResult {
  /** Final buffer to upload/download — may be original if compression was skipped or yielded no gain */
  buffer: Buffer;
  /** Whether compression actually reduced the file size */
  compressed: boolean;
  /** Original file size in bytes */
  originalSize: number;
  /** Final file size in bytes */
  finalSize: number;
  /** Human-readable summary logged server-side */
  summary: string;
}

export interface CompressPdfOptions {
  /** Force compression attempt regardless of trigger threshold (e.g. for standalone tool) */
  forceCompress?: boolean;
  /** Maximum pixel dimension (width or height) for embedded images. Default: 1400 */
  maxDimension?: number;
  /** JPEG quality (1-100) for re-encoded images. Default: 65 */
  jpegQuality?: number;
}

/**
 * Compress a PDF buffer by downsampling embedded images and optimizing object streams.
 *
 * @param fileBuffer  Raw file bytes from multer memoryStorage.
 * @param mimeType    MIME type declared by the client (e.g. 'application/pdf').
 * @param fileName    Original filename — used for logging.
 * @param options     Optional configuration overrides.
 */
export async function compressPdfIfNeeded(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  options?: CompressPdfOptions
): Promise<CompressionResult> {
  const originalSize = fileBuffer.length;
  const force = options?.forceCompress ?? false;
  const maxDimension = options?.maxDimension ?? 1400;
  const jpegQuality = options?.jpegQuality ?? 65;

  // Not a PDF — pass through untouched
  if (mimeType !== 'application/pdf') {
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: `[PDF Compression] Skipped (not a PDF): ${fileName} (${formatBytes(originalSize)})`,
    };
  }

  // Under trigger threshold and not forced — pass through untouched
  if (!force && originalSize < PDF_COMPRESS_TRIGGER_BYTES) {
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: `[PDF Compression] Skipped (${formatBytes(originalSize)} < trigger ${formatBytes(PDF_COMPRESS_TRIGGER_BYTES)}): ${fileName}`,
    };
  }

  console.log(
    `[PDF Compression] Starting compression for "${fileName}" (${formatBytes(originalSize)})...`
  );

  let compressedBuffer: Buffer;
  let reEncodedImagesCount = 0;

  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const enumerateObjects = pdfDoc.context.enumerateIndirectObjects();

    for (const [ref, object] of enumerateObjects) {
      if (!(object instanceof PDFRawStream)) {
        continue;
      }

      const dict = object.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (subtype !== PDFName.of('Image')) {
        continue;
      }

      const filter = dict.get(PDFName.of('Filter'));
      let filterName = '';
      if (filter instanceof PDFName) {
        filterName = filter.asString();
      } else if (filter instanceof PDFArray) {
        filterName = filter.asArray().map((f: any) => f.toString()).join(',');
      }

      let imgBuffer: Buffer | null = null;

      if (filterName.includes('DCTDecode')) {
        imgBuffer = Buffer.from(object.contents);
      } else if (filterName.includes('FlateDecode')) {
        try {
          imgBuffer = zlib.inflateSync(Buffer.from(object.contents));
        } catch {
          imgBuffer = Buffer.from(object.contents);
        }
      } else if (!filterName) {
        imgBuffer = Buffer.from(object.contents);
      }

      if (!imgBuffer || imgBuffer.length === 0) continue;

      try {
        const sharpImg = sharp(imgBuffer);
        const metadata = await sharpImg.metadata();

        if (!metadata.width || !metadata.height) continue;

        let needResize = false;
        let newWidth = metadata.width;
        let newHeight = metadata.height;

        if (metadata.width > maxDimension || metadata.height > maxDimension) {
          needResize = true;
          if (metadata.width >= metadata.height) {
            newWidth = maxDimension;
            newHeight = Math.round((metadata.height * maxDimension) / metadata.width);
          } else {
            newHeight = maxDimension;
            newWidth = Math.round((metadata.width * maxDimension) / metadata.height);
          }
        }

        let recompressed = sharpImg;
        if (needResize) {
          recompressed = recompressed.resize(newWidth, newHeight, { fit: 'inside' });
        }

        const compressedJpeg = await recompressed
          .jpeg({ quality: jpegQuality, mozjpeg: true })
          .toBuffer();

        // Only replace if re-compressed JPEG is actually smaller than original image stream
        if (compressedJpeg.length < object.contents.length) {
          dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
          dict.set(PDFName.of('Width'), PDFNumber.of(newWidth));
          dict.set(PDFName.of('Height'), PDFNumber.of(newHeight));
          dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
          dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
          dict.set(PDFName.of('Length'), PDFNumber.of(compressedJpeg.length));

          dict.delete(PDFName.of('DecodeParms'));

          const newStream = PDFRawStream.of(dict, compressedJpeg);
          pdfDoc.context.assign(ref, newStream);
          reEncodedImagesCount++;
        }
      } catch (imgErr: any) {
        // Soft warning for unparseable image stream; continue with other objects
        console.warn(`[PDF Compression] Skipped image object (${ref}):`, imgErr?.message || imgErr);
      }
    }

    const savedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    compressedBuffer = Buffer.from(savedBytes);

    // Verify PDF integrity by trying to load it back
    await PDFDocument.load(compressedBuffer, { ignoreEncryption: true });
  } catch (err: any) {
    const reason = err?.message || String(err);
    console.error(`[PDF Compression] Failed for "${fileName}":`, reason);
    throw new Error(
      `File PDF tidak dapat dikompresi atau corrupt (${reason}). ` +
      `Ukuran asli: ${formatBytes(originalSize)}. Silakan periksa kembali file Anda.`
    );
  }

  const finalSize = compressedBuffer.length;
  const savingPct = Math.round(((originalSize - finalSize) / originalSize) * 100);

  const summary =
    `[PDF Compression] "${fileName}": ${formatBytes(originalSize)} → ${formatBytes(finalSize)} ` +
    `(−${savingPct}%, re-encoded ${reEncodedImagesCount} images)`;

  console.log(summary);

  if (finalSize >= originalSize) {
    console.warn(
      `[PDF Compression] Compressed size is not smaller (${formatBytes(finalSize)} ≥ ${formatBytes(originalSize)}). ` +
      `Returning original buffer for "${fileName}".`
    );
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: summary + ' [already optimized — reverted to original]',
    };
  }

  return {
    buffer: compressedBuffer,
    compressed: true,
    originalSize,
    finalSize,
    summary,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
