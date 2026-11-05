import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';

export default function ChangeStorageDestinationModal({
  isOpen,
  onClose,
  initialCategory = 'incoming', // 'incoming' | 'outgoing'
  currentFolderId = null,
  onSelectDestination, // (folder: { id: string, name: string, category: string, path: string } | null) => void
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'My Drive' }]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const modalRef = useRef(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  // Fetch folders for the current parent directory via Google Drive API
  const fetchFolders = useCallback(async (parentId) => {
    setLoading(true);
    setError('');
    try {
      const parentParam = parentId && parentId !== 'root' ? `?parentId=${parentId}` : '';
      const response = await api.get(`/api/google/folders${parentParam}`);
      if (response.data.success) {
        setFolders(response.data.folders || []);
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error('Failed to fetch Drive folders for destination:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang akun Google di menu Profil.'
          : err.response?.data?.details || err.response?.data?.error || 'Gagal memuat folder Google Drive'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize or reset when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setSelectedFolder(null);
      setSearchQuery('');
      setError('');
      fetchFolders('root');
    }
  }, [isOpen, initialCategory, fetchFolders]);

  // Navigate deeper into a subfolder
  const handleNavigateInto = (folder, e) => {
    if (e) e.stopPropagation();
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFolder(null);
    setSearchQuery('');
    fetchFolders(folder.id);
  };

  // Jump to specific breadcrumb
  const handleNavigateToBreadcrumb = (index) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setSelectedFolder(null);
    setSearchQuery('');
    fetchFolders(target.id);
  };

  // Go up one level
  const handleGoUp = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);
      setSelectedFolder(null);
      setSearchQuery('');
      fetchFolders(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    }
  };

  // Select folder in list
  const handleSelectFolder = (folder) => {
    const fullPath = [...breadcrumbs.map((b) => b.name), folder.name].join('/');
    setSelectedFolder({
      id: folder.id,
      name: folder.name,
      category: activeCategory,
      path: fullPath,
    });
  };

  // Choose the current parent directory as target
  const handleChooseCurrentFolder = () => {
    if (currentFolder.id === 'root') {
      setError('Penyimpanan langsung pada root My Drive tidak disarankan. Silakan pilih atau buka sebuah subfolder.');
      return;
    }
    const fullPath = breadcrumbs.map((b) => b.name).join('/');
    setSelectedFolder({
      id: currentFolder.id,
      name: currentFolder.name,
      category: activeCategory,
      path: fullPath,
    });
  };

  // Reset to system default folder
  const handleChooseDefault = () => {
    onSelectDestination(null);
    onClose();
  };

  // Confirm selection
  const handleConfirm = () => {
    if (!selectedFolder) return;
    onSelectDestination(selectedFolder);
    onClose();
  };

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

  // Filter folders by search query
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const defaultPathText = activeCategory === 'incoming' ? 'esurat/MM-YY/' : 'esurat-keluar/MM-YY/';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[95] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-label="Pilih Folder Tujuan Penyimpanan Google Drive"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[88vh] animate-fadeIn"
      >
        {/* Header - Clean light theme with brand accent icon */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B164C] border border-purple-100 flex items-center justify-center text-lg flex-shrink-0">
              <i className="bi bi-folder-symlink" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Pilih Folder Tujuan Google Drive
              </h2>
              <p className="text-xs text-slate-500">
                Pilih lokasi Google Drive tujuan penyimpanan file surat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Category Switcher: Surat Masuk vs Surat Keluar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('incoming');
                if (selectedFolder) {
                  setSelectedFolder((prev) => prev ? { ...prev, category: 'incoming' } : null);
                }
              }}
              className={`flex items-center justify-center py-2 px-3 rounded-lg transition ${
                activeCategory === 'incoming'
                  ? 'bg-white text-[#4B164C] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-inbox-fill mr-1.5 text-sm" />
              Surat Masuk (esurat/)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('outgoing');
                if (selectedFolder) {
                  setSelectedFolder((prev) => prev ? { ...prev, category: 'outgoing' } : null);
                }
              }}
              className={`flex items-center justify-center py-2 px-3 rounded-lg transition ${
                activeCategory === 'outgoing'
                  ? 'bg-white text-[#4B164C] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="bi bi-send-fill mr-1.5 text-sm" />
              Surat Keluar (esurat-keluar/)
            </button>
          </div>

          {activeCategory !== initialCategory && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 flex items-center gap-1.5">
              <i className="bi bi-info-circle-fill text-amber-500 shrink-0" />
              <span>
                Kategori dialihkan dari form awal ({initialCategory === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'}).
              </span>
            </p>
          )}
        </div>

        {/* Breadcrumb Bar & Toolbar */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Breadcrumb trail */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 scrollbar-thin">
            {breadcrumbs.length > 1 && (
              <button
                type="button"
                onClick={handleGoUp}
                className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-md font-semibold text-slate-700 flex items-center gap-1 shadow-2xs transition shrink-0 mr-1"
                title="Naik ke folder induk"
              >
                <i className="bi bi-arrow-up text-xs" />
                <span>Level Atas</span>
              </button>
            )}

            <div className="flex items-center gap-1 whitespace-nowrap">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id || idx}>
                    {idx > 0 && <span className="text-slate-400 font-bold">/</span>}
                    <button
                      type="button"
                      onClick={() => handleNavigateToBreadcrumb(idx)}
                      disabled={isLast || loading}
                      className={`px-2 py-0.5 rounded-md transition text-xs ${
                        isLast
                          ? 'font-bold text-[#4B164C] bg-white border border-purple-200 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      <i className={`bi ${idx === 0 ? 'bi-hdd-network' : 'bi-folder'} mr-1 text-xs`} />
                      {crumb.name}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Action buttons on toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {currentFolder.id !== 'root' && (
              <button
                type="button"
                onClick={handleChooseCurrentFolder}
                className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#4B164C] border border-slate-200 rounded-md font-medium text-[11px] shadow-2xs transition flex items-center gap-1"
                title="Pilih folder saat ini sebagai tujuan"
              >
                <i className="bi bi-check2 text-xs" />
                Pilih Folder Ini
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchFolders(currentFolder.id)}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-200 border border-slate-200 rounded-md transition"
              title="Segarkan daftar folder"
            >
              <i className={`bi bi-arrow-clockwise text-xs ${loading ? 'animate-spin text-[#4B164C]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Search filter */}
        <div className="px-4 pt-3 pb-2 bg-white">
          <div className="relative">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Cari folder di lokasi ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4B164C] focus:ring-1 focus:ring-[#4B164C]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <i className="bi bi-x-circle-fill text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Folder List Content */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[46vh] min-h-[220px]">
          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4B164C] border-t-transparent mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-600">Memuat folder Google Drive...</p>
              <p className="text-[11px] text-slate-400 mt-1">Mengambil data folder langsung dari akun Anda</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <i className="bi bi-exclamation-triangle-fill text-red-500 text-base mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fetchFolders(currentFolder.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <i className="bi bi-folder-x text-2xl" />
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">
                {searchQuery ? 'Tidak ada folder yang cocok' : 'Tidak ada subfolder di lokasi ini'}
              </p>
              <p className="text-[11px] text-slate-500 mb-3">
                {currentFolder.id !== 'root'
                  ? `Anda dapat menggunakan "${currentFolder.name}" sebagai tujuan penyimpanan surat.`
                  : 'Folder penyimpanan otomatis default akan digunakan jika tidak memilih folder khusus.'}
              </p>
              {currentFolder.id !== 'root' && (
                <button
                  type="button"
                  onClick={handleChooseCurrentFolder}
                  className="px-3 py-1.5 bg-purple-50 text-[#4B164C] border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="bi bi-check-circle" />
                  Gunakan "{currentFolder.name}"
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredFolders.map((folder) => {
                const isSelected = selectedFolder?.id === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    onDoubleClick={(e) => handleNavigateInto(folder, e)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? 'bg-purple-50/90 border-[#4B164C] shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center min-w-0 mr-2 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 transition ${
                          isSelected
                            ? 'bg-[#4B164C] text-white'
                            : 'bg-amber-50 text-amber-500 border border-amber-100'
                        }`}
                      >
                        <i className="bi bi-folder-fill text-base" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#4B164C]' : 'text-slate-800'}`}>
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {folder.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <span className="text-[10px] bg-[#4B164C] text-white px-2 py-0.5 rounded-full font-bold">
                          Dipilih
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleNavigateInto(folder, e)}
                        className="px-2 py-1 text-slate-500 hover:text-[#4B164C] hover:bg-purple-100/60 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                        title="Buka subfolder"
                      >
                        <span>Buka</span>
                        <i className="bi bi-chevron-right text-[10px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selection summary & actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-400 font-medium">Lokasi tujuan penyimpanan:</p>
            <p className="text-xs font-bold text-slate-800 truncate font-mono mt-0.5">
              {selectedFolder ? (
                <span className="text-[#4B164C]">{selectedFolder.path}</span>
              ) : (
                <span className="text-slate-500 font-sans">
                  Default E-Surat (<span className="font-mono text-slate-700">{defaultPathText}</span>)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleChooseDefault}
              className="py-2 px-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
              title="Gunakan folder arsip standar per bulan"
            >
              Gunakan Default
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedFolder}
              onClick={handleConfirm}
              className="py-2 px-4 bg-[#4B164C] text-white font-bold rounded-xl text-xs hover:bg-[#381139] disabled:opacity-40 transition flex items-center shadow-xs"
            >
              <i className="bi bi-check2-circle mr-1.5" />
              Pilih Folder Ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
