import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatMonthDisplay(monthYear) {
  if (!monthYear) return 'Folder Arsip';
  const match = monthYear.match(/^(\d{2})-(\d{2})$/);
  if (match) {
    const monthNum = parseInt(match[1], 10);
    const yearYY = parseInt(match[2], 10);
    const fullYear = 2000 + yearYY;
    const monthName = ID_MONTHS[monthNum - 1] || match[1];
    return `${monthName} ${fullYear}`;
  }
  return monthYear;
}

export default function DriveManagerModal({
  isOpen,
  onClose,
  initialTab = 'incoming',
  onFolderChanged,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'incoming' | 'outgoing'
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create folder form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newMonthYear, setNewMonthYear] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}-${yy}`;
  });
  const [creating, setCreating] = useState(false);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState(null); // { id, name, driveId }
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { driveId, name, warning? }
  const [deleting, setDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchFolders(initialTab);
      setShowCreateForm(false);
      setRenameTarget(null);
      setDeleteTarget(null);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  const fetchFolders = useCallback(async (type) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch active months
      const res = await api.get(`/api/folders?letter_type=${type}`);
      const activeMonths = res.data.activeMonths || [];

      // 2. Fetch detailed folder records for each month
      const detailedList = [];
      for (const m of activeMonths) {
        try {
          const mRes = await api.get(`/api/folders?monthYear=${m}&letter_type=${type}`);
          const monthFolders = mRes.data.data || [];
          detailedList.push({
            monthYear: m,
            displayName: formatMonthDisplay(m),
            subfolders: monthFolders,
          });
        } catch (detailErr) {
          detailedList.push({
            monthYear: m,
            displayName: formatMonthDisplay(m),
            subfolders: [],
          });
        }
      }
      setFolders(detailedList);
    } catch (err) {
      console.error('Failed to load drive folders:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang Google di Profil.'
          : err.response?.data?.error || 'Gagal memuat folder Google Drive.'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
    fetchFolders(tab);
  };

  // Create folder handler
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setError('Nama folder tidak boleh kosong.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/api/folders', {
        name: newFolderName.trim(),
        monthYear: newMonthYear,
        letter_type: activeTab,
        file_type: 'pdf',
      });
      if (res.data.success) {
        setSuccessMsg(`Folder '${newFolderName}' berhasil dibuat di Google Drive!`);
        setNewFolderName('');
        setShowCreateForm(false);
        await fetchFolders(activeTab);
        if (onFolderChanged) onFolderChanged();
      }
    } catch (err) {
      console.error('Create folder error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Gagal membuat folder di Google Drive.');
    } finally {
      setCreating(false);
    }
  };

  // Rename folder handler
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    setError('');
    try {
      const res = await api.put(`/api/folders/${renameTarget.driveId}`, {
        name: renameValue.trim(),
      });
      if (res.data.success) {
        setSuccessMsg(`Folder berhasil diubah namanya menjadi '${renameValue.trim()}'.`);
        setRenameTarget(null);
        await fetchFolders(activeTab);
        if (onFolderChanged) onFolderChanged();
      }
    } catch (err) {
      console.error('Rename folder error:', err);
      setError(err.response?.data?.error || 'Gagal mengubah nama folder.');
    } finally {
      setRenaming(false);
    }
  };

  // Delete folder handler
  const handleDeleteConfirm = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const forceQuery = force ? '?force=true' : '';
      const res = await api.delete(`/api/folders/${deleteTarget.driveId}${forceQuery}`);
      if (res.data.success) {
        setSuccessMsg(`Folder '${deleteTarget.name}' berhasil dipindahkan ke kotak sampah Google Drive.`);
        setDeleteTarget(null);
        setDeleteWarning(null);
        await fetchFolders(activeTab);
        if (onFolderChanged) onFolderChanged();
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresConfirmation) {
        // Requires confirmation because letters exist
        setDeleteWarning(err.response.data);
      } else {
        console.error('Delete folder error:', err);
        setError(err.response?.data?.error || 'Gagal memindahkan folder ke kotak sampah.');
      }
    } finally {
      setDeleting(false);
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
        {/* Modal Header */}
        <div className="bg-[#4B164C] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-folder-check text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Kelola Folder Google Drive</h2>
              <p className="text-xs text-purple-200">
                Sinkronisasi langsung dengan akun Google Drive Anda
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

        {/* Tab Controls */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 pt-3 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleTabSwitch('incoming')}
              className={`py-2.5 px-4 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center ${
                activeTab === 'incoming'
                  ? 'border-[#4B164C] text-[#4B164C] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="bi bi-inbox-fill mr-2"></i>
              Surat Masuk (esurat/)
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('outgoing')}
              className={`py-2.5 px-4 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center ${
                activeTab === 'outgoing'
                  ? 'border-[#4B164C] text-[#4B164C] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="bi bi-send-fill mr-2"></i>
              Surat Keluar (esurat-keluar/)
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setError('');
              setSuccessMsg('');
            }}
            className="py-1.5 px-3 bg-[#4B164C] text-white rounded-lg text-xs font-bold hover:bg-[#381139] transition flex items-center shadow-sm mb-2"
          >
            <i className="bi bi-folder-plus mr-1.5"></i>
            Tambah Folder
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

        {/* Create Folder Accordion Form */}
        {showCreateForm && (
          <div className="bg-purple-50/70 border-b border-purple-100 p-6 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center">
              <i className="bi bi-plus-circle-fill text-[#4B164C] mr-2"></i>
              Buat Folder Baru di Google Drive ({activeTab === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'})
            </h3>
            <form onSubmit={handleCreateFolder} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bulan Arsip (MM-YY)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 04-26"
                  pattern="^\d{2}-\d{2}$"
                  title="Format harus MM-YY (contoh: 04-26)"
                  value={newMonthYear}
                  onChange={(e) => setNewMonthYear(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B164C] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Subfolder
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Surat Undangan"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B164C] bg-white"
                />
              </div>

              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 text-xs py-2.5 px-4 bg-[#4B164C] text-white font-bold rounded-xl hover:bg-[#381139] transition disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Membuat...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up mr-1.5"></i>
                      Simpan ke Drive
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

        {/* Folder List Content */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[55vh]">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4B164C] border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-semibold">Menghubungkan ke Google Drive...</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#4B164C] flex items-center justify-center mx-auto mb-3">
                <i className="bi bi-folder-x text-3xl"></i>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Belum Ada Folder Terdaftar di Google Drive
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Buat folder baru menggunakan tombol "Tambah Folder" di atas untuk memulai mengorganisir arsip Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {folders.map((group) => (
                <div
                  key={group.monthYear}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-purple-200 transition"
                >
                  {/* Month Folder Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B164C] flex items-center justify-center">
                        <i className="bi bi-folder-fill text-xl"></i>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-800">
                            {group.displayName}
                          </h4>
                          <span className="text-[10px] font-mono bg-purple-100 text-[#4B164C] px-2 py-0.5 rounded-full font-bold">
                            {group.monthYear}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {activeTab === 'incoming' ? 'esurat' : 'esurat-keluar'}/{group.monthYear}/
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">
                        {group.subfolders.length} Subfolder
                      </span>
                    </div>
                  </div>

                  {/* Subfolders list */}
                  <div className="mt-3 pl-3 sm:pl-6 space-y-2">
                    {/* Default subfolders tag */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        <i className="bi bi-file-earmark-spreadsheet text-emerald-600 mr-1"></i> Excel
                      </span>
                      <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        <i className="bi bi-image text-blue-600 mr-1"></i> Photos
                      </span>
                      <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        <i className="bi bi-file-earmark-pdf text-red-600 mr-1"></i> PDF
                      </span>
                    </div>

                    {/* Custom subfolders */}
                    {group.subfolders.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {group.subfolders.map((folder) => (
                          <div
                            key={folder.id || folder.google_drive_folder_id}
                            className="py-2 flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center space-x-2 min-w-0 mr-2">
                              <i className="bi bi-folder2 text-slate-400 group-hover:text-[#4B164C]"></i>
                              <span className="font-semibold text-slate-700 truncate">
                                {folder.name}
                              </span>
                              {folder.google_drive_folder_id && (
                                <a
                                  href={`https://drive.google.com/drive/folders/${folder.google_drive_folder_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Buka di Google Drive"
                                  className="text-[10px] text-purple-600 hover:text-purple-800 underline flex items-center"
                                >
                                  <i className="bi bi-box-arrow-up-right ml-1"></i>
                                </a>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameTarget({
                                    id: folder.id,
                                    name: folder.name,
                                    driveId: folder.google_drive_folder_id,
                                  });
                                  setRenameValue(folder.name);
                                }}
                                title="Ubah Nama Folder"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget({
                                    driveId: folder.google_drive_folder_id,
                                    name: folder.name,
                                  });
                                  setDeleteWarning(null);
                                }}
                                title="Pindahkan ke Kotak Sampah"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <i className="bi bi-trash3"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Belum ada subfolder khusus. Menggunakan struktur default (Excel/Photos/PDF).
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center">
            <i className="bi bi-shield-check text-emerald-600 mr-1.5"></i>
            Folder root default aman dan terlindungi
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-white border border-gray-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition"
          >
            Selesai
          </button>
        </div>

        {/* Rename Dialog Overlay */}
        {renameTarget && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center">
                <i className="bi bi-pencil-square text-[#4B164C] mr-2"></i>
                Ubah Nama Folder
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Nama folder akan langsung diperbarui di Google Drive. Isi dokumen di dalamnya tetap utuh.
              </p>
              <form onSubmit={handleRenameSubmit}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  required
                  autoFocus
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B164C] mb-4"
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
                    className="py-2 px-4 rounded-xl bg-[#4B164C] text-white text-xs font-bold hover:bg-[#381139] disabled:opacity-50"
                  >
                    {renaming ? 'Menyimpan...' : 'Simpan Nama Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <i className="bi bi-trash3 text-2xl"></i>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Pindahkan Folder ke Kotak Sampah?
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                Folder <span className="font-bold">"{deleteTarget.name}"</span> akan dipindahkan ke kotak sampah Google Drive Anda.
              </p>

              {deleteWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-4">
                  <div className="flex items-start">
                    <i className="bi bi-exclamation-triangle-fill text-amber-500 mr-2 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="font-bold">Peringatan: Ada data arsip tersimpan</p>
                      <p className="mt-0.5">{deleteWarning.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteWarning(null);
                  }}
                  className="py-2 px-4 rounded-xl border border-gray-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteConfirm(!!deleteWarning)}
                  className="py-2 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
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
    </div>
  );
}
