import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function SheetsManagerModal({
  isOpen,
  onClose,
  onSpreadsheetChanged,
}) {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [incomingSheetId, setIncomingSheetId] = useState(null);
  const [outgoingSheetId, setOutgoingSheetId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLetterType, setNewLetterType] = useState('incoming'); // 'incoming' | 'outgoing' | 'none'
  const [creating, setCreating] = useState(false);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, isConfigured, configuredType }
  const [deleting, setDeleting] = useState(false);

  // Assign action state
  const [assigningId, setAssigningId] = useState(null);

  const fetchSpreadsheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/google/spreadsheets');
      if (res.data.success && res.data.data) {
        setSpreadsheets(res.data.data.spreadsheets || []);
        setIncomingSheetId(res.data.data.incomingSheetId || null);
        setOutgoingSheetId(res.data.data.outgoingSheetId || null);
      }
    } catch (err) {
      console.error('Failed to load spreadsheets:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang Google di Profil.'
          : err.response?.data?.error || 'Gagal memuat spreadsheet dari Google Drive.'
      );
      setSpreadsheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSpreadsheets();
      setShowCreateForm(false);
      setRenameTarget(null);
      setDeleteTarget(null);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, fetchSpreadsheets]);

  // Create spreadsheet handler
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Judul spreadsheet tidak boleh kosong.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/api/google/spreadsheets', {
        title: newTitle.trim(),
        letterType: newLetterType,
      });
      if (res.data.success) {
        setSuccessMsg(`Spreadsheet '${newTitle.trim()}' berhasil dibuat di Google Sheets!`);
        setNewTitle('');
        setShowCreateForm(false);
        await fetchSpreadsheets();
        if (onSpreadsheetChanged) onSpreadsheetChanged();
      }
    } catch (err) {
      console.error('Create spreadsheet error:', err);
      setError(err.response?.data?.error || 'Gagal membuat spreadsheet.');
    } finally {
      setCreating(false);
    }
  };

  // Rename spreadsheet handler
  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    setError('');
    try {
      const res = await api.put(`/api/google/spreadsheets/${renameTarget.id}`, {
        name: renameValue.trim(),
      });
      if (res.data.success) {
        setSuccessMsg(`Spreadsheet berhasil diubah namanya menjadi '${renameValue.trim()}'.`);
        setRenameTarget(null);
        await fetchSpreadsheets();
        if (onSpreadsheetChanged) onSpreadsheetChanged();
      }
    } catch (err) {
      console.error('Rename spreadsheet error:', err);
      setError(err.response?.data?.error || 'Gagal mengubah nama spreadsheet.');
    } finally {
      setRenaming(false);
    }
  };

  // Delete spreadsheet handler
  const handleDelete = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const query = force ? '?force=true' : '';
      const res = await api.delete(`/api/google/spreadsheets/${deleteTarget.id}${query}`);
      if (res.data.success) {
        setSuccessMsg(`Spreadsheet '${deleteTarget.name}' berhasil dipindahkan ke kotak sampah Google Drive.`);
        setDeleteTarget(null);
        await fetchSpreadsheets();
        if (onSpreadsheetChanged) onSpreadsheetChanged();
      }
    } catch (err) {
      console.error('Delete spreadsheet error:', err);
      setError(err.response?.data?.error || 'Gagal memindahkan spreadsheet ke kotak sampah.');
    } finally {
      setDeleting(false);
    }
  };

  // Assign spreadsheet handler
  const handleAssign = async (spreadsheetId, letterType) => {
    setAssigningId(`${spreadsheetId}-${letterType}`);
    setError('');
    try {
      const res = await api.put(`/api/google/spreadsheets/${spreadsheetId}/assign`, {
        letterType,
      });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Konfigurasi spreadsheet berhasil diperbarui.');
        await fetchSpreadsheets();
        if (onSpreadsheetChanged) onSpreadsheetChanged();
      }
    } catch (err) {
      console.error('Assign spreadsheet error:', err);
      setError(err.response?.data?.error || 'Gagal mengubah spreadsheet aktif.');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#107c41] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-file-earmark-spreadsheet text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Kelola Google Sheets</h2>
              <p className="text-xs text-emerald-100">
                Pencatatan data surat terpusat dan sinkron otomatis dengan Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <i className="bi bi-info-circle text-emerald-600"></i>
            <span>Setiap surat baru akan otomatis dicatat sebagai baris data di spreadsheet aktif.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setError('');
              setSuccessMsg('');
            }}
            className="py-1.5 px-3 bg-[#107c41] text-white rounded-lg text-xs font-bold hover:bg-[#0c6233] transition flex items-center shadow-sm"
          >
            <i className="bi bi-plus-lg mr-1.5"></i>
            Buat Spreadsheet
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center">
              <i className="bi bi-exclamation-triangle-fill mr-2 text-red-500"></i>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <i className="bi bi-x"></i>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center">
              <i className="bi bi-check-circle-fill mr-2 text-emerald-500"></i>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
              <i className="bi bi-x"></i>
            </button>
          </div>
        )}

        {/* Create Spreadsheet Form */}
        {showCreateForm && (
          <div className="bg-emerald-50/70 border-b border-emerald-100 p-6 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center">
              <i className="bi bi-plus-circle-fill text-emerald-600 mr-2"></i>
              Buat Spreadsheet Baru di Google Sheets
            </h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Judul Spreadsheet
                </label>
                <input
                  type="text"
                  placeholder="Contoh: E-Surat Masuk 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Arsip
                </label>
                <select
                  value={newLetterType}
                  onChange={(e) => setNewLetterType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                >
                  <option value="incoming">Surat Masuk (Jadikan Aktif)</option>
                  <option value="outgoing">Surat Keluar (Jadikan Aktif)</option>
                  <option value="none">Cadangan / Arsip Saja</option>
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 text-xs py-2.5 px-4 bg-[#107c41] text-white font-bold rounded-xl hover:bg-[#0c6233] transition disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Membuat...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-file-earmark-plus mr-1.5"></i>
                      Simpan ke Sheets
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs py-2.5 px-3 bg-white border border-gray-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Spreadsheet List */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[55vh]">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#107c41] border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-semibold">Memuat spreadsheet dari Google Drive...</p>
            </div>
          ) : spreadsheets.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <i className="bi bi-file-earmark-spreadsheet text-3xl"></i>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Belum Ada Spreadsheet Ditemukan
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Buat spreadsheet baru dengan tombol di atas untuk mulai mencatat rekapan arsip surat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {spreadsheets.map((sheet) => {
                const isIncoming = sheet.id === incomingSheetId;
                const isOutgoing = sheet.id === outgoingSheetId;

                return (
                  <div
                    key={sheet.id}
                    className={`bg-white border rounded-2xl p-4 shadow-sm transition ${
                      isIncoming || isOutgoing
                        ? 'border-emerald-300 ring-1 ring-emerald-100 bg-emerald-50/20'
                        : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Icon and Name */}
                      <div className="flex items-start space-x-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isIncoming || isOutgoing
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-800 truncate">
                              {sheet.name}
                            </h4>
                            {isIncoming && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                Aktif: Surat Masuk
                              </span>
                            )}
                            {isOutgoing && (
                              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                                Aktif: Surat Keluar
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-1">
                            <span>ID: {sheet.id.slice(0, 16)}...</span>
                            <span>&bull;</span>
                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-900 underline flex items-center"
                            >
                              Buka di Google Sheets
                              <i className="bi bi-box-arrow-up-right ml-1 text-[10px]"></i>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                        {/* Assign Buttons */}
                        {!isIncoming && (
                          <button
                            type="button"
                            disabled={assigningId === `${sheet.id}-incoming`}
                            onClick={() => handleAssign(sheet.id, 'incoming')}
                            className="text-[11px] py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition flex items-center"
                          >
                            Set Surat Masuk
                          </button>
                        )}
                        {!isOutgoing && (
                          <button
                            type="button"
                            disabled={assigningId === `${sheet.id}-outgoing`}
                            onClick={() => handleAssign(sheet.id, 'outgoing')}
                            className="text-[11px] py-1.5 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition flex items-center"
                          >
                            Set Surat Keluar
                          </button>
                        )}

                        {/* Rename */}
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(sheet);
                            setRenameValue(sheet.name);
                          }}
                          title="Ubah Nama"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget({
                              ...sheet,
                              isConfigured: isIncoming || isOutgoing,
                              configuredType: isIncoming && isOutgoing ? 'keduanya' : isIncoming ? 'Surat Masuk' : 'Surat Keluar',
                            });
                          }}
                          title="Pindahkan ke Kotak Sampah"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center">
            <i className="bi bi-shield-check text-emerald-600 mr-1.5"></i>
            Header kolom otomatis disesuaikan dengan skema arsip
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-white border border-gray-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition"
          >
            Selesai
          </button>
        </div>

        {/* Rename Dialog */}
        {renameTarget && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center">
                <i className="bi bi-pencil-square text-emerald-600 mr-2"></i>
                Ubah Nama Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Nama spreadsheet akan diperbarui di Google Drive tanpa mengubah data atau baris yang sudah ada.
              </p>
              <form onSubmit={handleRename}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  required
                  autoFocus
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(null)}
                    className="py-2 px-4 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={renaming || !renameValue.trim()}
                    className="py-2 px-4 rounded-xl bg-[#107c41] text-white text-xs font-bold hover:bg-[#0c6233] disabled:opacity-50"
                  >
                    {renaming ? 'Menyimpan...' : 'Simpan Nama Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <i className="bi bi-trash3 text-2xl"></i>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Pindahkan Spreadsheet ke Kotak Sampah?
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                Spreadsheet <span className="font-bold">"{deleteTarget.name}"</span> akan dipindahkan ke kotak sampah Google Drive Anda.
              </p>

              {deleteTarget.isConfigured && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-4">
                  <div className="flex items-start">
                    <i className="bi bi-exclamation-triangle-fill text-amber-500 mr-2 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="font-bold">Peringatan: Spreadsheet Sedang Aktif</p>
                      <p className="mt-0.5">
                        File ini saat ini dikonfigurasi untuk pencatatan otomatis <span className="font-bold">{deleteTarget.configuredType}</span>. Menghapusnya akan menonaktifkan sinkronisasi hingga Anda memilih spreadsheet pengganti.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="py-2 px-4 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(true)}
                  className="py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Memindahkan...
                    </>
                  ) : (
                    deleteTarget.isConfigured ? 'Ya, Tetap Hapus' : 'Pindahkan ke Sampah'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
