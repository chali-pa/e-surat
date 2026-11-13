import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function FolderSelector({ 
  letterDate, 
  selectedFolder, 
  onFolderChange, 
  letterType = 'incoming',
  fileType = 'pdf',
  disabled = false 
}) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previousMonthYear, setPreviousMonthYear] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null);

  // Get MM-YY format from letter date
  const getMonthYearFromDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}-${yy}`;
  };

  const currentMonthYear = getMonthYearFromDate(letterDate);

  // Fetch folders directly from Google Drive / backend
  const fetchFolders = useCallback(async () => {
    if (!currentMonthYear) {
      setFolders([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/folders', {
        params: { 
          monthYear: currentMonthYear,
          letter_type: letterType
        }
      });
      
      if (response.data.success) {
        const folderList = response.data.data || [];
        setFolders(folderList);

        // If previously selected folder is no longer present in Google Drive, clear selection
        if (selectedFolder) {
          const stillExists = folderList.some(
            f => String(f.id) === String(selectedFolder.id) ||
                (f.google_drive_folder_id && f.google_drive_folder_id === selectedFolder.google_drive_folder_id)
          );
          if (!stillExists) {
            onFolderChange(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Hubungkan ulang di Profil.'
          : 'Gagal memuat folder dari Google Drive'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonthYear, letterType, selectedFolder, onFolderChange]);

  useEffect(() => {
    fetchFolders();
  }, [currentMonthYear, letterType]);

  // Auto-clear selectedFolder when monthYear changes
  useEffect(() => {
    if (previousMonthYear && currentMonthYear && previousMonthYear !== currentMonthYear) {
      onFolderChange(null);
    }
    setPreviousMonthYear(currentMonthYear);
  }, [currentMonthYear, previousMonthYear, onFolderChange]);

  const handleFolderChange = (e) => {
    const val = e.target.value;
    if (!val) {
      onFolderChange(null);
      return;
    }
    const selected = folders.find(f => String(f.id) === String(val) || f.google_drive_folder_id === val);
    onFolderChange(selected || null);
  };

  // ── CREATE FOLDER 
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    setError('');
    try {
      const response = await api.post('/api/folders', {
        monthYear: currentMonthYear,
        name: newFolderName.trim(),
        letter_type: letterType,
        file_type: fileType
      });

      if (response.data.success) {
        const folderId = response.data.folder?.id || response.data.data?.folderId;
        const driveId = response.data.folder?.googleDriveFolderId || response.data.data?.googleDriveFolderId;

        const newFolderObj = {
          id: folderId,
          name: newFolderName.trim(),
          google_drive_folder_id: driveId,
          month: currentMonthYear,
          letter_type: letterType,
        };

        setFolders(prev => [...prev, newFolderObj]);
        onFolderChange(newFolderObj);
        setNewFolderName('');
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Gagal membuat folder di Google Drive');
    } finally {
      setCreating(false);
    }
  };

  // ── RENAME FOLDER 
  const handleOpenRename = () => {
    if (!selectedFolder) return;
    setRenameFolderName(selectedFolder.name || '');
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFolder || !renameFolderName.trim()) return;

    const driveId = selectedFolder.google_drive_folder_id || selectedFolder.id;
    setRenaming(true);
    setError('');
    try {
      const response = await api.put(`/api/folders/${driveId}`, {
        name: renameFolderName.trim()
      });

      if (response.data.success) {
        const updatedName = renameFolderName.trim();
        setFolders(prev =>
          prev.map(f => (f.id === selectedFolder.id || f.google_drive_folder_id === driveId)
            ? { ...f, name: updatedName }
            : f
          )
        );
        onFolderChange({ ...selectedFolder, name: updatedName });
        setShowRenameModal(false);
      }
    } catch (err) {
      console.error('Failed to rename folder:', err);
      setError(err.response?.data?.error || 'Gagal mengubah nama folder di Google Drive');
    } finally {
      setRenaming(false);
    }
  };

  // ── DELETE FOLDER 
  const handleOpenDelete = () => {
    if (!selectedFolder) return;
    setDeleteWarning(null);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async (force = false) => {
    if (!selectedFolder) return;

    const driveId = selectedFolder.google_drive_folder_id || selectedFolder.id;
    setDeleting(true);
    setError('');
    try {
      const query = force ? '?force=true' : '';
      const response = await api.delete(`/api/folders/${driveId}${query}`);

      if (response.data.success) {
        setFolders(prev => prev.filter(f => f.id !== selectedFolder.id && f.google_drive_folder_id !== driveId));
        onFolderChange(null);
        setShowDeleteModal(false);
        setDeleteWarning(null);
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresConfirmation) {
        setDeleteWarning(err.response.data);
      } else {
        console.error('Failed to delete folder:', err);
        setError(err.response?.data?.error || 'Gagal memindahkan folder ke kotak sampah');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <i className="bi bi-folder2 text-[#4B164C]" />
          Folder (Opsional)
        </label>
        
        {/* Quick actions: Create, Rename, Delete, Refresh */}
        {!disabled && currentMonthYear && (
          <div className="flex items-center gap-1 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setNewFolderName('');
                setShowCreateModal(true);
              }}
              title="Buat folder baru di Google Drive"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B164C] bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition"
            >
              <i className="bi bi-folder-plus text-xs" />
              <span>Buat</span>
            </button>

            {selectedFolder && (
              <>
                <button
                  type="button"
                  onClick={handleOpenRename}
                  title="Ubah nama folder yang dipilih"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                >
                  <i className="bi bi-pencil text-xs" />
                  <span>Ubah Nama</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenDelete}
                  title="Pindahkan folder ini ke kotak sampah Google Drive"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition"
                >
                  <i className="bi bi-trash3 text-xs" />
                  <span>Hapus</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={fetchFolders}
              disabled={loading}
              title="Segarkan & sinkronkan dari Google Drive"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <i className={`bi bi-arrow-clockwise text-xs ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Select Dropdown */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <i className="bi bi-folder text-base" />
        </span>
        
        <select
          value={selectedFolder ? (selectedFolder.id || selectedFolder.google_drive_folder_id || '') : ''}
          onChange={handleFolderChange}
          disabled={disabled || loading || !currentMonthYear}
          className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 bg-white pl-10 pr-10 ${
            disabled || loading || !currentMonthYear
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 hover:border-[#DD88CF]/60 focus:border-[#4B164C] focus:ring-2 focus:ring-[#4B164C]/10'
          }`}
        >
          <option value="">Gunakan Folder Bulanan Default ({currentMonthYear ? `${letterType === 'incoming' ? 'esurat' : 'esurat-keluar'}/${currentMonthYear}/` : 'Sesuai Tanggal Surat'})</option>
          {folders.map((folder) => (
            <option key={folder.id || folder.google_drive_folder_id} value={folder.id || folder.google_drive_folder_id}>
              📁 {folder.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Messages */}
      {loading && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5 animate-pulse">
          <i className="bi bi-arrow-repeat animate-spin text-[#4B164C]" />
          <span>Memeriksa folder di Google Drive...</span>
        </p>
      )}

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-200">
          <i className="bi bi-exclamation-triangle-fill text-red-500" />
          <span>{error}</span>
        </p>
      )}

      {!currentMonthYear && !disabled && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <i className="bi bi-info-circle text-slate-400" />
          Pilih tanggal surat terlebih dahulu untuk memuat folder arsip
        </p>
      )}

      {selectedFolder && (
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono">
          <i className="bi bi-check-circle-fill text-emerald-600" />
          <span>Tujuan surat: {letterType === 'incoming' ? 'esurat' : 'esurat-keluar'}/{currentMonthYear}/{selectedFolder.name}/</span>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i className="bi bi-folder-plus text-[#4B164C]" />
                Buat Folder di Google Drive
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Folder
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Undangan Rapat"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B164C]"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Folder akan dibuat di bawah: <span className="font-mono font-semibold text-slate-600">{letterType === 'incoming' ? 'esurat' : 'esurat-keluar'}/{currentMonthYear}/</span>
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2 px-3 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating || !newFolderName.trim()}
                  className="py-2 px-4 rounded-xl bg-[#4B164C] text-white text-xs font-bold hover:bg-[#381139] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up" />
                      Buat di Drive
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RENAME FOLDER MODAL ────────────────────────────────────────── */}
      {showRenameModal && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i className="bi bi-pencil-square text-[#4B164C]" />
                Ubah Nama Folder Drive
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Baru
                </label>
                <input
                  type="text"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B164C]"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Nama folder di Google Drive akan langsung diperbarui. Dokumen di dalamnya tetap aman.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="py-2 px-3 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameFolderName.trim()}
                  className="py-2 px-4 rounded-xl bg-[#4B164C] text-white text-xs font-bold hover:bg-[#381139] disabled:opacity-50"
                >
                  {renaming ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE FOLDER MODAL ────────────────────────────────────────── */}
      {showDeleteModal && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <i className="bi bi-trash3 text-xl" />
            </div>

            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Pindahkan Folder ke Sampah?
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Folder <span className="font-bold">"{selectedFolder.name}"</span> akan dipindahkan ke kotak sampah Google Drive Anda.
            </p>

            {deleteWarning && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-3">
                <p className="font-bold">Ada Arsip Surat Tersimpan:</p>
                <p className="mt-0.5">{deleteWarning.message}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteWarning(null);
                }}
                className="py-2 px-3 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDeleteSubmit(!!deleteWarning)}
                className="py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                    Memindahkan...
                  </>
                ) : (
                  deleteWarning ? 'Ya, Tetap Hapus' : 'Pindahkan ke Sampah'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
