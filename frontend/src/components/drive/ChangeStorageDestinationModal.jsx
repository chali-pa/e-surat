import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function ChangeStorageDestinationModal({
  isOpen,
  onClose,
  initialCategory = 'incoming', // 'incoming' | 'outgoing'
  currentFolderId = null,
  onSelectDestination, // (folder: { id: string, name: string, category: string, path: string }) => void
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const modalRef = useRef(null);

  // Sync initialCategory
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setSelectedFolder(null);
      setError('');
    }
  }, [isOpen, initialCategory]);

  // Fetch folders for the active category
  const fetchFolders = useCallback(async (cat) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch month folders
      const res = await api.get(`/api/folders?letter_type=${cat}`);
      const activeMonths = res.data.activeMonths || [];

      // 2. Fetch subfolders for each active month
      const items = [];
      for (const m of activeMonths) {
        try {
          const detailRes = await api.get(`/api/folders?monthYear=${m}&letter_type=${cat}`);
          const subfolders = detailRes.data.data || [];
          items.push({
            id: `month-${m}`,
            monthYear: m,
            name: `${formatMonthDisplay(m)} (${m})`,
            category: cat,
            path: `${cat === 'incoming' ? 'esurat' : 'esurat-keluar'}/${m}/`,
            isMonthRoot: true,
            subfolders: subfolders.map(sf => ({
              id: sf.google_drive_folder_id || String(sf.id),
              dbId: sf.id,
              name: sf.name,
              category: cat,
              path: `${cat === 'incoming' ? 'esurat' : 'esurat-keluar'}/${m}/${sf.name}`,
            }))
          });
        } catch {
          items.push({
            id: `month-${m}`,
            monthYear: m,
            name: `${formatMonthDisplay(m)} (${m})`,
            category: cat,
            path: `${cat === 'incoming' ? 'esurat' : 'esurat-keluar'}/${m}/`,
            isMonthRoot: true,
            subfolders: []
          });
        }
      }
      setFolders(items);
    } catch (err) {
      console.error('Failed to load destination folders:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang Google di Profil.'
          : 'Gagal memuat folder Google Drive.'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFolders(activeCategory);
    }
  }, [isOpen, activeCategory, fetchFolders]);

  // Escape key listener & click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedFolder) return;
    onSelectDestination(selectedFolder);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[95] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-label="Pilih Folder Tujuan Penyimpanan Google Drive"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col my-auto max-h-[85vh] animate-fadeIn"
      >
        {/* Header */}
        <div className="bg-[#4B164C] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-folder-symlink text-xl"></i>
            </div>
            <div>
              <h2 className="text-base font-bold">Pilih Folder Tujuan Drive</h2>
              <p className="text-xs text-purple-200">
                Pilih folder Google Drive tempat file surat ini akan disimpan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg text-base"></i>
          </button>
        </div>

        {/* Category switcher: Surat Masuk vs Surat Keluar */}
        <div className="p-3 bg-slate-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('incoming');
                setSelectedFolder(null);
              }}
              className={`flex items-center justify-center py-2 px-3 rounded-lg transition ${
                activeCategory === 'incoming'
                  ? 'bg-white text-[#4B164C] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-inbox-fill mr-1.5 text-sm"></i>
              Surat Masuk (esurat/)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('outgoing');
                setSelectedFolder(null);
              }}
              className={`flex items-center justify-center py-2 px-3 rounded-lg transition ${
                activeCategory === 'outgoing'
                  ? 'bg-white text-[#4B164C] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-send-fill mr-1.5 text-sm"></i>
              Surat Keluar (esurat-keluar/)
            </button>
          </div>

          {activeCategory !== initialCategory && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 flex items-center gap-1.5">
              <i className="bi bi-info-circle-fill text-amber-500 shrink-0"></i>
              <span>Anda memilih kategori yang berbeda dari form saat ini ({initialCategory === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'}).</span>
            </p>
          )}
        </div>

        {/* Folder List Content */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[50vh] space-y-2">
          {loading ? (
            <div className="py-10 text-center text-slate-500">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#4B164C] border-t-transparent mx-auto mb-2"></div>
              <p className="text-xs font-medium">Memuat folder dari Google Drive...</p>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill text-red-500"></i>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchFolders(activeCategory)}
                className="text-xs font-bold underline"
              >
                Coba Lagi
              </button>
            </div>
          ) : folders.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#4B164C] flex items-center justify-center mx-auto mb-2">
                <i className="bi bi-folder-x text-2xl"></i>
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">Belum Ada Folder Khusus</p>
              <p className="text-[11px] text-slate-500">
                Penyimpanan akan menggunakan folder default sistem: <span className="font-mono font-medium">{activeCategory === 'incoming' ? 'esurat/MM-YY/' : 'esurat-keluar/MM-YY/'}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((group) => {
                const isGroupSelected = selectedFolder?.id === group.id;

                return (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white transition hover:border-purple-200"
                  >
                    {/* Month folder header button */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFolder({
                          id: group.id,
                          monthYear: group.monthYear,
                          name: group.name,
                          category: group.category,
                          path: group.path,
                          isMonthRoot: true,
                        })
                      }
                      className={`w-full text-left p-3 flex items-center justify-between transition ${
                        isGroupSelected
                          ? 'bg-purple-100/70 text-[#4B164C] font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center min-w-0 mr-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 ${
                            isGroupSelected ? 'bg-[#4B164C] text-white' : 'bg-purple-50 text-[#4B164C]'
                          }`}
                        >
                          <i className="bi bi-folder-fill text-base"></i>
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate leading-tight">{group.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{group.path}</p>
                        </div>
                      </div>

                      {isGroupSelected && (
                        <span className="text-[10px] bg-[#4B164C] text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                          Dipilih
                        </span>
                      )}
                    </button>

                    {/* Subfolders under this month */}
                    {group.subfolders && group.subfolders.length > 0 && (
                      <div className="bg-slate-50/70 border-t border-gray-100 p-2 pl-6 space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Subfolder di dalam {group.monthYear}:
                        </p>
                        {group.subfolders.map((sf) => {
                          const isSfSelected = selectedFolder?.id === sf.id;

                          return (
                            <button
                              key={sf.id}
                              type="button"
                              onClick={() =>
                                setSelectedFolder({
                                  id: sf.id,
                                  dbId: sf.dbId,
                                  name: sf.name,
                                  category: sf.category,
                                  path: sf.path,
                                  isMonthRoot: false,
                                })
                              }
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                                isSfSelected
                                  ? 'bg-[#4B164C] text-white font-bold shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center min-w-0 mr-2">
                                <i className={`bi bi-folder2 mr-2 ${isSfSelected ? 'text-white' : 'text-slate-400'}`}></i>
                                <span className="truncate">{sf.name}</span>
                              </div>
                              {isSfSelected && (
                                <i className="bi bi-check-lg text-sm text-white shrink-0"></i>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selection summary & actions */}
        <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">Folder yang dipilih:</p>
            <p className="text-xs font-bold text-slate-800 truncate font-mono">
              {selectedFolder ? selectedFolder.path : 'Gunakan folder default sistem'}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 bg-white border border-gray-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedFolder}
              onClick={handleConfirm}
              className="py-2 px-4 bg-[#4B164C] text-white font-bold rounded-xl text-xs hover:bg-[#381139] disabled:opacity-40 transition flex items-center shadow-xs"
            >
              <i className="bi bi-check2-circle mr-1.5"></i>
              Pilih Folder Ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
