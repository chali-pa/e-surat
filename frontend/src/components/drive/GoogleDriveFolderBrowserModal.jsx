import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function GoogleDriveFolderBrowserModal({
  isOpen,
  onClose,
  letterType = 'incoming',
  currentStorage,
  onFolderSelected,
}) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'My Drive' }]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [useMonthlyOrganization, setUseMonthlyOrganization] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'select' | 'reset'

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  // Fetch folders whenever current level changes
  const fetchFolders = useCallback(async (parentId) => {
    setLoading(true);
    setError('');
    try {
      const parentParam = parentId && parentId !== 'root' ? `?parentId=${parentId}` : '';
      const response = await api.get(`/api/google/folders${parentParam}`);
      if (response.data.success) {
        setFolders(response.data.folders || []);
      }
    } catch (err) {
      console.error('Failed to fetch Drive folders:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang akun Google Anda.'
          : err.response?.data?.details || err.response?.data?.error || 'Gagal memuat folder Google Drive'
      );
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setSelectedFolder(null);
      setUseMonthlyOrganization(currentStorage?.useMonthlyOrganization ?? false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
      fetchFolders('root');
    }
  }, [isOpen, fetchFolders, currentStorage]);

  const handleNavigateInto = (folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    fetchFolders(folder.id);
  };

  const handleNavigateToBreadcrumb = (index) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    fetchFolders(target.id);
  };

  const handleGoUp = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);
      fetchFolders(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    }
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
  };

  const handleChooseCurrentFolder = () => {
    if (currentFolder.id === 'root') {
      setError('Penyimpanan langsung pada root My Drive tidak disarankan. Silakan pilih atau buat subfolder.');
      return;
    }
    setSelectedFolder({ id: currentFolder.id, name: currentFolder.name });
  };

  const handleInitiateConfirm = (action) => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleExecuteSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (confirmAction === 'reset') {
        const response = await api.put('/api/google/storage-settings', {
          letterType,
          resetToDefault: true,
        });
        if (response.data.success) {
          onFolderSelected(response.data.data);
          onClose();
        }
      } else if (confirmAction === 'select') {
        if (!selectedFolder) {
          setError('Silakan pilih folder terlebih dahulu.');
          setSaving(false);
          setShowConfirmDialog(false);
          return;
        }

        const response = await api.put('/api/google/storage-settings', {
          letterType,
          folderId: selectedFolder.id,
          folderName: selectedFolder.name,
          useMonthlyOrganization,
        });

        if (response.data.success) {
          onFolderSelected(response.data.data);
          onClose();
        }
      }
    } catch (err) {
      console.error('Failed to update storage settings:', err);
      const isReconnect = err.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      setError(
        isReconnect
          ? 'Koneksi Google perlu diperbarui. Silakan hubungkan ulang akun Google Anda.'
          : err.response?.data?.details || err.response?.data?.error || 'Gagal menyimpan pengaturan penyimpanan'
      );
      setShowConfirmDialog(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const letterTypeLabel = letterType === 'incoming' ? 'Surat Masuk' : 'Surat Keluar';
  const defaultFolderName = letterType === 'incoming' ? 'esurat' : 'esurat-keluar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4B164C]/10 text-[#4B164C] flex items-center justify-center text-xl">
              <i className="bi bi-folder2-open" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Pilih Folder Penyimpanan Google Drive
              </h2>
              <p className="text-xs text-slate-500">
                Tujuan unggahan untuk: <span className="font-semibold text-[#4B164C]">{letterTypeLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <i className="bi bi-exclamation-triangle-fill text-red-500 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Current storage info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span>
              Penyimpanan saat ini:{' '}
              <span className="font-semibold text-slate-800">
                {currentStorage?.folderName || defaultFolderName}
              </span>
              {currentStorage?.isDefault ? (
                <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                  Default E-Surat
                </span>
              ) : (
                <span className="ml-2 px-2 py-0.5 bg-[#DD88CF]/20 text-[#4B164C] text-[10px] font-bold rounded-full">
                  Folder Kustom
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleInitiateConfirm('reset')}
              disabled={currentStorage?.isDefault || saving}
              className="px-2.5 py-1 text-slate-600 hover:text-[#4B164C] hover:bg-white rounded-lg border border-slate-200 text-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kembalikan tujuan penyimpanan ke folder otomatis E-Surat"
            >
              <i className="bi bi-arrow-counterclockwise mr-1" />
              Gunakan Default ({defaultFolderName})
            </button>
          </div>

          {/* Breadcrumbs navigation bar */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-xl text-xs overflow-x-auto">
            {breadcrumbs.length > 1 && (
              <button
                type="button"
                onClick={handleGoUp}
                className="px-2 py-1 bg-white hover:bg-slate-200 rounded-md font-medium text-slate-700 flex items-center gap-1 shadow-sm transition"
                title="Naik satu tingkat"
              >
                <i className="bi bi-arrow-up text-xs" />
                <span>Level Atas</span>
              </button>
            )}

            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id || idx}>
                    {idx > 0 && <span className="text-slate-400">/</span>}
                    <button
                      type="button"
                      onClick={() => handleNavigateToBreadcrumb(idx)}
                      disabled={isLast || loading}
                      className={`px-2 py-1 rounded-md transition whitespace-nowrap ${
                        isLast
                          ? 'font-bold text-[#4B164C] bg-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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

          {/* Folder list */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[220px] max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <i className="bi bi-arrow-repeat animate-spin text-2xl text-[#4B164C]" />
                <span className="text-xs">Memuat folder Google Drive Anda...</span>
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-4 text-center">
                <i className="bi bi-folder-x text-3xl text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Tidak ada folder ditemukan di lokasi ini</p>
                {currentFolder.id !== 'root' && (
                  <button
                    type="button"
                    onClick={handleChooseCurrentFolder}
                    className="mt-2 text-xs font-semibold text-[#4B164C] hover:underline"
                  >
                    Gunakan folder saat ini ("{currentFolder.name}") sebagai tujuan
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {folders.map((folder) => {
                  const isSelected = selectedFolder?.id === folder.id;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder)}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-[#4B164C]/5 border-l-4 border-l-[#4B164C]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base ${
                            isSelected ? 'bg-[#4B164C] text-white' : 'bg-amber-50 text-amber-500'
                          }`}
                        >
                          <i className="bi bi-folder-fill" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#4B164C]' : 'text-slate-800'}`}>
                            {folder.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {folder.id.slice(0, 16)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateInto(folder);
                          }}
                          className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-[#4B164C] hover:bg-slate-100 text-xs font-medium transition flex items-center gap-1"
                          title={`Buka folder ${folder.name}`}
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

          {/* Current folder selection quick button */}
          {currentFolder.id !== 'root' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Atau pilih folder yang sedang dibuka:{' '}
                <span className="font-semibold text-slate-800">{currentFolder.name}</span>
              </span>
              <button
                type="button"
                onClick={handleChooseCurrentFolder}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
              >
                Pilih Folder "{currentFolder.name}"
              </button>
            </div>
          )}

          {/* Selected folder banner and options */}
          {selectedFolder && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <i className="bi bi-check-circle-fill text-emerald-600 text-base mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-900">
                    Folder Terpilih: <span className="font-bold">{selectedFolder.name}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    File surat baru akan disimpan ke dalam folder ini. File yang sudah ada sebelumnya tidak akan diubah atau dihapus.
                  </p>
                </div>
              </div>

              {/* Monthly organization checkbox */}
              <label className="flex items-start gap-2.5 pt-2 border-t border-emerald-200/60 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={useMonthlyOrganization}
                  onChange={(e) => setUseMonthlyOrganization(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#4B164C] focus:ring-[#4B164C]"
                />
                <div>
                  <span className="font-medium text-slate-800">
                    Gunakan subfolder bulanan (MM-YY) di dalam folder ini (Opsional)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Jika tidak dicentang, surat diunggah langsung ke folder pilihan tanpa membuat subfolder baru.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-200/60 transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => handleInitiateConfirm('select')}
            disabled={!selectedFolder || saving}
            className="px-5 py-2.5 bg-[#4B164C] hover:bg-[#3a123a] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle" />
                Pilih Folder Ini
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
              <i className="bi bi-question-circle-fill" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {confirmAction === 'reset'
                  ? `Kembalikan ke Folder Default (${defaultFolderName})?`
                  : 'Konfirmasi Pemilihan Folder'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {confirmAction === 'reset' ? (
                  <>
                    Tujuan penyimpanan untuk <span className="font-semibold">{letterTypeLabel}</span> akan dikembalikan ke folder default E-Surat (<span className="font-semibold">{defaultFolderName}</span>). File yang telah tersimpan sebelumnya tidak akan dipindahkan.
                  </>
                ) : (
                  <>
                    Atur folder <span className="font-semibold text-slate-900">"{selectedFolder?.name}"</span> sebagai tujuan penyimpanan <span className="font-semibold">{letterTypeLabel}</span>?
                    <br />
                    <span className="block mt-1 text-slate-500 text-[11px]">
                      File dan folder lain yang sudah ada di dalam folder tersebut akan tetap aman dan tidak akan diubah atau dihapus.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={saving}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSave}
                disabled={saving}
                className="px-4 py-2 bg-[#4B164C] hover:bg-[#3a123a] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg" />
                    Ya, Simpan Pengaturan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
