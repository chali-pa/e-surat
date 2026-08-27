import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { getOAuth2ClientForUser } from './userGoogleAuthService';
import { createEmailLog } from '../models/EmailLog';

/** Max file size for direct PDF attachment (10 MB). Larger files fall back to Google Drive link. */
export const PDF_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface SendMailParams {
  userId: number;
  suratType: 'masuk' | 'keluar';
  suratId: number;
  recipients: string | string[];
  customMessage?: string;
  suratData: {
    nomorSurat: string;
    namaSuratOrPerihal: string;
    pengirimOrPenerima: string;
    tanggal: string;
    googleDriveId?: string | null;
    filePath?: string | null;
  };
}

export interface SendMailResult {
  success: boolean;
  deliveryType: 'attachment' | 'drive_link';
  recipients: string[];
  message: string;
}

/**
 * Validate and clean recipient email address(es).
 */
export function parseAndValidateEmails(input: string | string[]): string[] {
  const rawList = Array.isArray(input) ? input : input.split(',');
  const cleaned = rawList
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (cleaned.length === 0) {
    throw new Error('Alamat email penerima tidak boleh kosong.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of cleaned) {
    if (!emailRegex.test(email)) {
      throw new Error(`Format alamat email tidak valid: "${email}".`);
    }
  }

  return cleaned;
}

/**
 * Create Nodemailer transporter from environment configuration.
 */
function getTransporter() {
  const host = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASSWORD;
  const secure = process.env.EMAIL_SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    throw new Error(
      'Konfigurasi SMTP email belum diatur di server (EMAIL_SMTP_USER / EMAIL_SMTP_PASSWORD tidak ditemukan). ' +
      'Silakan atur variabel lingkungan SMTP di server.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Attempt to fetch document buffer from Google Drive or local file system.
 */
async function fetchDocumentBuffer(
  userId: number,
  googleDriveId?: string | null,
  filePath?: string | null
): Promise<{ buffer: Buffer | null; driveLink: string | null }> {
  let driveLink: string | null = null;

  if (googleDriveId) {
    driveLink = `https://drive.google.com/file/d/${googleDriveId}/view`;
    try {
      const auth = await getOAuth2ClientForUser(userId);
      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.files.get(
        { fileId: googleDriveId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      if (response.data) {
        return { buffer: Buffer.from(response.data as ArrayBuffer), driveLink };
      }
    } catch (e: any) {
      console.warn(`[EmailService] Unable to download file ${googleDriveId} from Google Drive:`, e?.message || e);
    }
  }

  if (filePath) {
    try {
      const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '../../', filePath);
      if (fs.existsSync(absPath)) {
        return { buffer: fs.readFileSync(absPath), driveLink };
      }
    } catch (e: any) {
      console.warn(`[EmailService] Unable to read local file ${filePath}:`, e?.message || e);
    }
  }

  return { buffer: null, driveLink };
}

/**
 * Build HTML email template.
 */
function buildHtmlBody(
  suratType: 'masuk' | 'keluar',
  suratData: SendMailParams['suratData'],
  deliveryType: 'attachment' | 'drive_link',
  driveLink: string | null,
  customMessage?: string
): string {
  const typeTitle = suratType === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const partyLabel = suratType === 'masuk' ? 'Pengirim' : 'Penerima';
  const cleanNomor = suratData.nomorSurat || '-';
  const cleanPerihal = suratData.namaSuratOrPerihal || '-';
  const cleanParty = suratData.pengirimOrPenerima || '-';

  let customNoteHtml = '';
  if (customMessage && customMessage.trim()) {
    customNoteHtml = `
      <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #4B164C; border-radius: 6px;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #475569;">Pesan Tambahan:</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #334155; white-space: pre-wrap;">${escapeHtml(customMessage.trim())}</p>
      </div>
    `;
  }

  let fileActionHtml = '';
  if (deliveryType === 'attachment') {
    fileActionHtml = `
      <p style="margin-top: 20px; font-size: 13px; color: #15803d; background: #f0fdf4; padding: 10px 14px; border-radius: 8px; border: 1px solid #bbf7d0;">
        📎 Dokumen surat terlampir sebagai file PDF pada email ini.
      </p>
    `;
  } else if (driveLink) {
    fileActionHtml = `
      <div style="margin-top: 20px; text-align: center;">
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
          Dokumen berukuran besar, Anda dapat melihat dan mengunduh surat secara langsung melalui Google Drive:
        </p>
        <a href="${driveLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4B164C 0%, #DD88CF 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          📄 Buka Surat di Google Drive
        </a>
      </div>
    `;
  } else {
    fileActionHtml = `
      <p style="margin-top: 20px; font-size: 13px; color: #b45309; background: #fffbeb; padding: 10px 14px; border-radius: 8px; border: 1px solid #fde68a;">
        ⚠️ Dokumen fisik surat tidak dapat dilampirkan. Silakan hubungi pengirim untuk informasi lebih lanjut.
      </p>
    `;
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="border-bottom: 2px solid #4B164C; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #4B164C; margin: 0; font-size: 20px;">E-Surat — ${typeTitle}</h2>
      </div>

      <p style="font-size: 14px; color: #334155; line-height: 1.5;">
        Dengan hormat,<br/>Berikut disampaikan dokumen <strong>${typeTitle}</strong> dengan rincian sebagai berikut:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #475569; width: 35%; border: 1px solid #e2e8f0;">Nomor Surat</td>
          <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${escapeHtml(cleanNomor)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #475569; border: 1px solid #e2e8f0;">Perihal / Nama Surat</td>
          <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${escapeHtml(cleanPerihal)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #475569; border: 1px solid #e2e8f0;">${partyLabel}</td>
          <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${escapeHtml(cleanParty)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #475569; border: 1px solid #e2e8f0;">Tanggal</td>
          <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${escapeHtml(suratData.tanggal || '-')}</td>
        </tr>
      </table>

      ${customNoteHtml}
      ${fileActionHtml}

      <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0;">Email ini dikirim secara otomatis dari Sistem E-Surat.</p>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Main email sending service method.
 */
export async function sendMailWithSurat(params: SendMailParams): Promise<SendMailResult> {
  const { userId, suratType, suratId, recipients, customMessage, suratData } = params;

  // 1. Validate recipients
  const validRecipients = parseAndValidateEmails(recipients);

  // 2. Retrieve document buffer
  const { buffer, driveLink } = await fetchDocumentBuffer(
    userId,
    suratData.googleDriveId,
    suratData.filePath
  );

  // 3. Determine attachment vs drive link fallback
  let deliveryType: 'attachment' | 'drive_link' = 'drive_link';
  let attachments: any[] = [];

  if (buffer && buffer.length <= PDF_ATTACHMENT_MAX_BYTES) {
    deliveryType = 'attachment';
    const safeFilename = (suratData.nomorSurat || 'Surat')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim();
    attachments.push({
      filename: `${safeFilename}.pdf`,
      content: buffer,
      contentType: 'application/pdf',
    });
  }

  const subject = `[E-Surat] ${suratType === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'} No. ${suratData.nomorSurat || '-'}`;
  const html = buildHtmlBody(suratType, suratData, deliveryType, driveLink, customMessage);
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SMTP_USER;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `E-Surat <${fromAddress}>`,
      to: validRecipients.join(', '),
      subject,
      html,
      attachments,
    });

    // Log success
    await createEmailLog({
      userId,
      suratType,
      suratId,
      recipients: validRecipients.join(', '),
      subject,
      deliveryType,
      status: 'success',
    });

    return {
      success: true,
      deliveryType,
      recipients: validRecipients,
      message: `Email surat berhasil dikirim ke ${validRecipients.join(', ')} (${deliveryType === 'attachment' ? 'sebagai lampiran PDF' : 'sebagai link Google Drive'}).`,
    };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[EmailService] Send email failed:', errMsg);

    // Log failure
    await createEmailLog({
      userId,
      suratType,
      suratId,
      recipients: validRecipients.join(', '),
      subject,
      deliveryType,
      status: 'failed',
      errorMessage: errMsg,
    });

    throw new Error(`Gagal mengirim email: ${errMsg}`);
  }
}
