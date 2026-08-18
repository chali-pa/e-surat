import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Initialize Google Auth with Service Account
// Process the private key to handle different formats
let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

// Handle escaped newlines from environment variables
privateKey = privateKey.replace(/\\n/g, '\n');

// Handle literal \n strings
privateKey = privateKey.replace(/\\\\n/g, '\n');

// Ensure proper PEM format
if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Upload file to Google Drive
 * @param filePath - Local path to the file
 * @param fileName - Name for the file in Drive
 * @param folderId - Google Drive folder ID (optional, uses root if not provided)
 * @returns File ID and web view link
 */
export async function uploadToDrive(
  filePath: string,
  fileName: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string }> {
  try {
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });

    // Make file publicly viewable
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink || '',
    };
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Append row to Google Sheet
 * @param sheetId - Google Sheet ID
 * @param range - Range to append to (e.g., 'Sheet1!A:E')
 * @param values - Array of values to append
 * @returns Row number where data was appended
 */
export async function appendToSheet(
  sheetId: string,
  range: string,
  values: any[]
): Promise<number> {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return response.data.updates?.updatedRows || 0;
  } catch (error) {
    console.error('Error appending to Sheet:', error);
    throw new Error('Failed to append data to Google Sheet');
  }
}

/**
 * Create a new Google Sheet
 * @param title - Title for the spreadsheet
 * @returns Sheet ID
 */
export async function createSheet(title: string): Promise<string> {
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title,
        },
        sheets: [
          {
            properties: {
              title: 'Data',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    // Add headers
    const sheetId = response.data.spreadsheetId!;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Data!A1:G1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['ID', 'Nomor Surat', 'Pengirim/Penerima', 'Perihal', 'Tanggal', 'File Link', 'Created At']],
      },
    });

    // Make sheet publicly viewable
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return sheetId;
  } catch (error) {
    console.error('Error creating Sheet:', error);
    throw new Error('Failed to create Google Sheet');
  }
}

/**
 * Create a new folder in Google Drive
 * @param folderName - Name for the folder
 * @param parentFolderId - Parent folder ID (optional)
 * @returns Folder ID
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return response.data.id!;
  } catch (error) {
    console.error('Error creating Drive folder:', error);
    throw new Error('Failed to create Google Drive folder');
  }
}

/**
 * Delete file from Google Drive
 * @param fileId - Google Drive file ID
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error('Error deleting from Drive:', error);
    throw new Error('Failed to delete file from Google Drive');
  }
}

export default {
  uploadToDrive,
  appendToSheet,
  createSheet,
  createDriveFolder,
  deleteFromDrive,
};
