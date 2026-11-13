import React, { useState, useEffect, useRef, useCallback } from 'react';
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

export default function FolderSwitcherPopup({
  isOpen,
  onClose,
  triggerRef,
  currentTab = 'incoming', // 'incoming' | 'outgoing'
  currentMonthSel = null, // { year, month } or MM-YY string
  onSelectFolder, // (folder: { month: string, driveId?: string, name?: string }, letterType: 'incoming' | 'outgoing') => void
  onOpenDriveManager,
}) {
  const [activeType, setActiveType] = useState(currentTab);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const popupRef = useRef(null);

  // Sync activeType when currentTab prop changes or popup opens
  useEffect(() => {
    if (isOpen) {
      setActiveType(currentTab);
      setFocusedIndex(-1);
    }
  }, [isOpen, currentTab]);

  // Fetch folders for selected letter type
  const fetchFolders = useCallback(async (type) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/folders?letter_type=${type}`);
      if (res.data.success) {
        // activeMonths contains array of string MM-YY like ["04-26", "03-26"]
        const list = res.data.activeMonths || [];
        setFolders(list);
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error('Failed to load folders for switcher:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang Google di Profil.'
          : 'Gagal memuat folder dari Google Drive.'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFolders(activeType);
    }
  }, [isOpen, activeType, fetchFolders]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < folders.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : folders.length - 1));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && folders[focusedIndex]) {
        e.preventDefault();
        handleFolderClick(folders[focusedIndex]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef, folders, focusedIndex]);

  if (!isOpen) return null;

  const handleFolderClick = (monthStr) => {
    onSelectFolder(monthStr, activeType);
    onClose();
  };

  // Convert currentMonthSel to MM-YY string for comparison
  let activeMonthKey = '';
  if (currentMonthSel) {
    if (typeof currentMonthSel === 'string') {
      activeMonthKey = currentMonthSel;
    } else if (currentMonthSel.year && currentMonthSel.month) {
      const mm = String(currentMonthSel.month).padStart(2, '0');
      const yy = String(currentMonthSel.year).slice(-2);
      activeMonthKey = `${mm}-${yy}`;
    }
  }

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Pilih Folder Surat"
      aria-modal="true"
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[80] overflow-hidden animate-fadeIn"
      style={{
        maxHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* Header with Type Selector Tabs */}
      <div className="bg-slate-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4B164C]"></span>
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Folder Arsip Drive
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
            aria-label="Tutup popup"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Segmented Control: Surat Masuk vs Surat Keluar */}
        <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveType('incoming')}
            className={`flex items-center justify-center py-2 px-3 rounded-lg transition-all ${
              activeType === 'incoming'
                ? 'bg-white text-[#4B164C] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="bi bi-inbox-fill mr-1.5 text-sm"></i>
            Surat Masuk
          </button>
          <button
            type="button"
            onClick={() => setActiveType('outgoing')}
            className={`flex items-center justify-center py-2 px-3 rounded-lg transition-all ${
              activeType === 'outgoing'
                ? 'bg-white text-[#4B164C] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="bi bi-send-fill mr-1.5 text-sm"></i>
            Surat Keluar
          </button>
        </div>

        {/* Path preview */}
        <div className="mt-2 text-[11px] text-slate-500 flex items-center px-1 font-mono">
          <i className="bi bi-folder-symlink mr-1 text-slate-400"></i>
          <span>
            {activeType === 'incoming' ? 'esurat' : 'esurat-keluar'}/[MM-YY]/
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-slate-500">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#4B164C] border-t-transparent mx-auto mb-2"></div>
            <p className="text-xs font-medium">Memuat folder dari Google Drive...</p>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            <div className="flex items-start">
              <i className="bi bi-exclamation-triangle-fill mr-2 mt-0.5 text-red-500 flex-shrink-0"></i>
              <div>
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchFolders(activeType)}
                  className="mt-2 inline-flex items-center text-[11px] font-bold text-red-700 hover:text-red-900 underline"
                >
                  <i className="bi bi-arrow-clockwise mr-1"></i>
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        ) : folders.length === 0 ? (
          <div className="py-8 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#4B164C] flex items-center justify-center mx-auto mb-2">
              <i className="bi bi-folder-x text-2xl"></i>
            </div>
            <p className="text-xs font-bold text-slate-700 mb-1">Belum Ada Folder Bulanan</p>
            <p className="text-[11px] text-slate-500 mb-3">
              Folder akan dibuat otomatis saat Anda mengunggah surat atau membuat folder baru.
            </p>
          </div>
        ) : (
          <div className="space-y-1" role="listbox">
            {folders.map((monthKey, index) => {
              const isActive = activeType === currentTab && activeMonthKey === monthKey;
              const isFocused = focusedIndex === index;

              return (
                <button
                  key={monthKey}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleFolderClick(monthKey)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-purple-50 text-[#4B164C] font-bold border border-purple-200 shadow-sm'
                      : isFocused
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center min-w-0 mr-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 ${
                        isActive
                          ? 'bg-[#4B164C] text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-[#4B164C]'
                      }`}
                    >
                      <i className="bi bi-folder2 text-base"></i>
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight">
                        {formatMonthDisplay(monthKey)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {monthKey} &bull; Excel, Photos, PDF
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-shrink-0">
                    {isActive ? (
                      <span className="text-[10px] bg-[#4B164C] text-white px-2 py-0.5 rounded-full font-bold">
                        Aktif
                      </span>
                    ) : (
                      <i className="bi bi-chevron-right text-xs text-slate-300 group-hover:text-slate-500"></i>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with action to open full Drive Manager */}
      <div className="p-2.5 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenDriveManager) onOpenDriveManager();
          }}
          className="text-[#4B164C] hover:text-[#381139] font-semibold text-[11px] flex items-center py-1 px-2 rounded-lg hover:bg-purple-50 transition"
        >
          <i className="bi bi-gear-fill mr-1.5"></i>
          Kelola Folder Google Drive
        </button>

        <button
          type="button"
          onClick={() => fetchFolders(activeType)}
          title="Segarkan Folder"
          className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition"
        >
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>
  );
}
