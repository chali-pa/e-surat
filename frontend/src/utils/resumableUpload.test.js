import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadLetterFileResumable } from './resumableUpload';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('uploadLetterFileResumable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects files larger than 50 MB with a clear message', async () => {
    const oversizedFile = new File([''], 'oversized.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversizedFile, 'size', { value: 50.5 * 1024 * 1024 });

    await expect(
      uploadLetterFileResumable({
        file: oversizedFile,
        letterType: 'incoming',
        letterDate: '2026-11-06',
      })
    ).rejects.toThrow('Ukuran file maksimum adalah 50 MB. File Anda 50.5 MB — silakan kurangi ukurannya dan coba lagi.');
  });

  it('accepts files at 50 MB exactly', async () => {
    const file50MB = new File([''], 'test50mb.pdf', { type: 'application/pdf' });
    Object.defineProperty(file50MB, 'size', { value: 50 * 1024 * 1024 });

    api.post.mockResolvedValueOnce({
      data: {
        sessionUri: 'https://test.google.com/upload-session',
        logicalPath: 'esurat/11-26/PDF/test50mb.pdf',
        parentFolderId: 'folder123',
        storageDestination: 'esurat',
      },
    });

    // Mock XMLHttpRequest
    const xhrMock = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(function () {
        this.status = 200;
        this.responseText = JSON.stringify({ id: 'drive_file_50mb' });
        this.onload();
      }),
      upload: { onprogress: null },
    };
    vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));

    const result = await uploadLetterFileResumable({
      file: file50MB,
      letterType: 'incoming',
      letterDate: '2026-11-06',
    });

    expect(result.uploaded_drive_file_id).toBe('drive_file_50mb');
  });

  it('successfully uploads a 9.15 MB reproduction file', async () => {
    const size915MB = Math.floor(9.15 * 1024 * 1024);
    const file915MB = new File([''], 'document_9.15mb.pdf', { type: 'application/pdf' });
    Object.defineProperty(file915MB, 'size', { value: size915MB });

    api.post.mockResolvedValueOnce({
      data: {
        sessionUri: 'https://test.google.com/upload-session-915',
        logicalPath: 'esurat/11-26/PDF/document_9.15mb.pdf',
        parentFolderId: 'folder915',
        storageDestination: 'esurat',
      },
    });

    let progressCalls = [];
    const xhrMock = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(function () {
        if (this.upload.onprogress) {
          this.upload.onprogress({ lengthComputable: true, loaded: 4500000, total: size915MB });
        }
        this.status = 200;
        this.responseText = JSON.stringify({ id: 'drive_file_915' });
        this.onload();
      }),
      upload: { onprogress: null },
    };
    vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));

    const result = await uploadLetterFileResumable({
      file: file915MB,
      letterType: 'incoming',
      letterDate: '2026-11-06',
      onProgress: (p) => progressCalls.push(p),
    });

    expect(api.post).toHaveBeenCalledWith('/api/surat/upload-session', expect.objectContaining({
      original_file_name: 'document_9.15mb.pdf',
      file_size: size915MB,
      mime_type: 'application/pdf',
    }));
    expect(xhrMock.open).toHaveBeenCalledWith('PUT', 'https://test.google.com/upload-session-915', true);
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith('Content-Range', `bytes 0-${size915MB - 1}/${size915MB}`);
    expect(result.uploaded_drive_file_id).toBe('drive_file_915');
    expect(progressCalls).toContain(100);
  });

  it('supports outgoing mail resumable upload session', async () => {
    const file = new File([''], 'outgoing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    api.post.mockResolvedValueOnce({
      data: {
        sessionUri: 'https://test.google.com/upload-session-outgoing',
        logicalPath: 'esurat-keluar/11-26/PDF/outgoing.pdf',
        parentFolderId: 'folderOutgoing',
        storageDestination: 'esurat-keluar',
      },
    });

    const xhrMock = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(function () {
        this.status = 200;
        this.responseText = JSON.stringify({ id: 'drive_outgoing_123' });
        this.onload();
      }),
      upload: { onprogress: null },
    };
    vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));

    const result = await uploadLetterFileResumable({
      file,
      letterType: 'outgoing',
      letterDate: '2026-11-06',
    });

    expect(api.post).toHaveBeenCalledWith('/api/surat-keluar/upload-session', expect.anything());
    expect(result.uploaded_drive_file_id).toBe('drive_outgoing_123');
  });
});
