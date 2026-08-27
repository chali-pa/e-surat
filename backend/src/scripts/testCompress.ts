import { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFArray } from 'pdf-lib';
import sharp from 'sharp';
import zlib from 'zlib';

async function createSamplePdf(): Promise<Buffer> {
  // Create a high resolution image using sharp
  const largeImageBuffer = await sharp({
    create: {
      width: 2500,
      height: 2500,
      channels: 3,
      background: { r: 200, g: 50, b: 50 }
    }
  })
  .composite([
    {
      input: Buffer.from(
        `<svg width="2500" height="2500">
          <circle cx="1250" cy="1250" r="1000" fill="blue" />
          <text x="1250" y="1250" font-size="120" fill="white" text-anchor="middle">HIGH RES SCANNED TEST DOCUMENT</text>
        </svg>`
      )
    }
  ])
  .jpeg({ quality: 100 }) // high quality JPEG (~1.5-3MB)
  .toBuffer();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const image = await pdfDoc.embedJpg(largeImageBuffer);
  page.drawImage(image, { x: 50, y: 100, width: 500, height: 600 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function compressPdf(pdfBuffer: Buffer, maxDimension = 1200, jpegQuality = 60): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const enumerateObjects = pdfDoc.context.enumerateIndirectObjects();

  let imagesCompressed = 0;

  for (const [ref, object] of enumerateObjects) {
    if (!(object instanceof PDFRawStream)) {
      continue;
    }

    const dict = object.dict;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (subtype !== PDFName.of('Image')) {
      continue;
    }

    // Check filter
    const filter = dict.get(PDFName.of('Filter'));
    let filterName = '';
    if (filter instanceof PDFName) {
      filterName = filter.asString();
    } else if (filter instanceof PDFArray) {
      filterName = filter.asArray().map((f: any) => f.toString()).join(',');
    }

    let imgBuffer: Buffer | null = null;

    if (filterName.includes('DCTDecode')) {
      // JPEG image stream
      imgBuffer = Buffer.from(object.contents);
    } else if (filterName.includes('FlateDecode')) {
      // Flate (zlib) stream - try inflating to see if sharp can parse
      try {
        const decompressed = zlib.inflateSync(Buffer.from(object.contents));
        imgBuffer = decompressed;
      } catch {
        imgBuffer = Buffer.from(object.contents);
      }
    } else if (!filterName) {
      // Uncompressed stream
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

      // Recompress to JPEG with sharp
      let recompressed = sharpImg;
      if (needResize) {
        recompressed = recompressed.resize(newWidth, newHeight, { fit: 'inside' });
      }
      
      const compressedJpeg = await recompressed.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();

      // Only replace if compressed version is actually smaller
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

        imagesCompressed++;
      }
    } catch (e) {
      console.warn(`[CompressTest] Skipped image object (${ref}):`, (e as Error).message);
    }
  }

  console.log(`[CompressTest] Re-encoded ${imagesCompressed} images inside PDF.`);

  const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return Buffer.from(compressedPdfBytes);
}

async function main() {
  console.log('--- Step 1: Generating Sample PDF with large image ---');
  const samplePdf = await createSamplePdf();
  console.log(`Original PDF size: ${samplePdf.length} bytes (${(samplePdf.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log('--- Step 2: Compressing PDF ---');
  const compressedPdf = await compressPdf(samplePdf);
  console.log(`Compressed PDF size: ${compressedPdf.length} bytes (${(compressedPdf.length / 1024 / 1024).toFixed(2)} MB)`);
  
  const savingPct = Math.round(((samplePdf.length - compressedPdf.length) / samplePdf.length) * 100);
  console.log(`Size Reduction: -${savingPct}%`);

  // Verify resulting PDF can be parsed back with pdf-lib
  console.log('--- Step 3: Verifying PDF Integrity ---');
  const verifiedDoc = await PDFDocument.load(compressedPdf);
  console.log(`Verified! PDF has ${verifiedDoc.getPageCount()} page(s).`);
}

main().catch(console.error);
