/**
 * PdfCompressorPage.jsx
 *
 * Standalone PDF compression utility — completely independent of any mail
 * record.  The user picks a PDF, sees its size, presses "Compress", and
 * gets a download link for the compressed result.  Nothing is saved to the
 * database or Google Drive.
 *
 * Backend endpoint: POST /api/compress-pdf
 * Threshold info:   GET  /api/compress-pdf/info
 *
 * The threshold used here is read from the backend via /info so it stays
 * in sync with pdfCompressionService.ts — there is only one source of
 * truth for the 8 MB trigger value.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../api/axios';

// ─── helpers ──────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function savingPct(original, final) {
  if (!original || original === 0) return 0;
  return Math.max(0, Math.round(((original - final) / original) * 100));
}

// ─── component ────────────────────────────────────────────────────────────

export default function PdfCompressorPage() {
  // Threshold info fetched from backend
  const [thresholdInfo, setThresholdInfo] = useState(null);

  // File selection
  const [file, setFile] = useState(null);           // File object
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Compression state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);       // { blob, originalSize, finalSize, wasCompressed, fileName }
  const [error, setError] = useState('');

  // Fetch threshold constants once on mount so the hint label is always accurate
  useEffect(() => {
    api.get('/api/compress-pdf/info')
      .then((r) => setThresholdInfo(r.data))
      .catch(() => {/* non-fatal — just won't show the badge */});
  }, []);

  // ── File selection ───────────────────────────────────────────────────

  const handleFileSelect = useCallback((selectedFile) => {
    setError('');
    setResult(null);
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setError('Hanya file PDF yang dapat dikompres oleh alat ini.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  }, [handleFileSelect]);

  const handleInputChange = (e) => handleFileSelect(e.target.files?.[0] ?? null);

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Compression ──────────────────────────────────────────────────────

  const handleCompress = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/compress-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      // Read the custom headers the server returns
      const originalSize = parseInt(response.headers['x-original-size'] || '0', 10);
      const finalSize    = parseInt(response.headers['x-compressed-size'] || '0', 10);
      const wasCompressed = response.headers['x-was-compressed'] === 'true';

      const baseName = file.name.replace(/\.pdf$/i, '');
      const outputName = `${baseName}_compressed.pdf`;

      setResult({
        blob: response.data,
        originalSize,
        finalSize,
        wasCompressed,
        fileName: outputName,
      });
    } catch (err) {
      // err.response?.data is a Blob because responseType='blob' — read it as text
      let msg = 'Gagal mengompres PDF. Silakan coba file lain.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.message || parsed.error || msg;
        } catch { /* keep default */ }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ───────────────────────────────────────────────────────────

  const triggerLabel = thresholdInfo?.trigger_label ?? '8 MB';

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            <i className="bi bi-file-zip" />
          </span>
          <h1 className="text-2xl font-bold text-[#4B164C]">Kompresor PDF</h1>
        </div>
        <p className="text-sm text-slate-500 ml-10">
          Kompres file PDF secara langsung — tanpa menyimpan ke Drive atau membuat catatan surat.
        </p>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <i className="bi bi-info-circle-fill text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold">Cara kerja kompresor ini</p>
          <p className="text-xs text-blue-600">
            File diunggah ke server, dikompres menggunakan pdf-lib (re-save dengan object streams),
            lalu langsung diunduh ke perangkat Anda. Tidak ada data yang disimpan ke database atau Google Drive.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Pemampatan terbaik pada PDF dengan banyak elemen teks dan metadata. File yang sudah
            dioptimalkan atau hanya berisi gambar mungkin tidak berkurang secara signifikan.
          </p>
          {thresholdInfo && (
            <p className="text-xs text-blue-500 mt-1">
              Sama dengan fitur kompres otomatis pada formulir surat — menggunakan ambang batas <strong>{triggerLabel}</strong>.
            </p>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, #4B164C08 0%, #DD88CF0A 100%)' }}
        >
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <i className="bi bi-file-earmark-zip text-[#4B164C]" />
            Upload & Kompres
          </h3>
        </div>

        <div className="p-4 sm:p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <i className="bi bi-exclamation-triangle-fill text-red-400 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200 ${
              file
                ? 'cursor-default'
                : 'cursor-pointer'
            } ${
              dragActive
                ? 'border-[#4B164C] bg-[#4B164C]/5 scale-[1.01]'
                : file
                ? result
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-[#DD88CF] bg-purple-50/30'
                : error
                ? 'border-red-300 bg-red-50/20 hover:border-red-400'
                : 'border-slate-200 bg-slate-50/50 hover:border-[#DD88CF] hover:bg-[#DD88CF]/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleInputChange}
            />

            {file ? (
              /* File chosen — show details */
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-2xl text-red-500">
                  <i className="bi bi-file-earmark-pdf-fill" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ukuran asli: <span className="font-medium text-slate-600">{formatBytes(file.size)}</span>
                    {thresholdInfo && file.size >= thresholdInfo.trigger_bytes && (
                      <span className="ml-2 text-amber-600 font-medium">
                        (≥ {triggerLabel} — akan dikompres)
                      </span>
                    )}
                    {thresholdInfo && file.size < thresholdInfo.trigger_bytes && (
                      <span className="ml-2 text-slate-400">
                        ({'<'} {triggerLabel} — re-save tanpa kompresi agresif)
                      </span>
                    )}
                  </p>
                </div>
                {!result && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <i className="bi bi-x-circle" /> Hapus file
                  </button>
                )}
              </div>
            ) : (
              /* No file yet */
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                  dragActive ? 'bg-[#4B164C]/10 text-[#4B164C] scale-110' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i className={`bi ${dragActive ? 'bi-cloud-arrow-down-fill' : 'bi-cloud-arrow-up'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    {dragActive ? 'Lepaskan file PDF di sini' : (
                      <>Drag & drop file PDF atau{' '}
                        <span className="text-[#4B164C] underline underline-offset-2">pilih file</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Hanya file PDF</p>
                </div>
              </div>
            )}
          </div>

          {/* Result panel */}
          {result && (
            <div className={`rounded-xl p-4 border ${
              result.wasCompressed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <i className={`bi ${result.wasCompressed ? 'bi-check-circle-fill text-emerald-500' : 'bi-info-circle-fill text-blue-400'} text-xl flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  {result.wasCompressed ? (
                    <>
                      <p className="font-semibold text-emerald-800 text-sm">Kompresi berhasil!</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3 text-center">
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-xs text-slate-500">Ukuran Asli</p>
                          <p className="font-bold text-slate-700 text-sm">{formatBytes(result.originalSize)}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-xs text-slate-500">Setelah Kompres</p>
                          <p className="font-bold text-emerald-700 text-sm">{formatBytes(result.finalSize)}</p>
                        </div>
                        <div className="bg-emerald-100 rounded-lg p-2">
                          <p className="text-xs text-emerald-600">Penghematan</p>
                          <p className="font-bold text-emerald-700 text-sm">
                            −{savingPct(result.originalSize, result.finalSize)}%
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-blue-800 text-sm">File di-save ulang</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        File berukuran {formatBytes(result.originalSize)} — di bawah ambang kompresi ({triggerLabel}).
                        File tetap di-save ulang oleh pdf-lib (membersihkan metadata dan struktur).
                        Hasil: {formatBytes(result.finalSize)}.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons — flex-wrap so "Kompres File Lain" falls below on very narrow screens */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!result ? (
              /* Before compression */
              <>
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90 min-h-[44px]"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Mengompres…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-file-zip" />
                      Kompres PDF
                    </>
                  )}
                </button>
                {file && !loading && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-gray-50 hover:border-slate-300 transition min-h-[44px]"
                  >
                    Reset
                  </button>
                )}
              </>
            ) : (
              /* After compression */
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-md transition hover:opacity-90 min-h-[44px]"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  <i className="bi bi-download" />
                  Unduh Hasil ({formatBytes(result.finalSize)})
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-gray-50 hover:border-slate-300 transition min-h-[44px]"
                >
                  <i className="bi bi-arrow-clockwise mr-1" />
                  Kompres File Lain
                </button>
              </>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
