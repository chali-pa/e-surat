import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import MailTable from '../../components/mail/MailTable';
import MailForm from '../../components/mail/MailForm';
import DeleteConfirmDialog from '../../components/mail/DeleteConfirmDialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function MailManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL routing / tabs sync (Section 1 requirement)
  const queryType = searchParams.get('type');
  const initialTab = (queryType === 'outgoing') ? 'outgoing' : 'incoming';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingId, setEditingId] = useState(null);

  // Current-month filter — only applies to incoming mail (per spec).
  // Defaults to true so the page opens showing the most relevant records.
  // Resets back to true whenever the user switches back to the incoming tab.
  const [currentMonthOnly, setCurrentMonthOnly] = useState(true);

  const [surats, setSurats] = useState([]);
  const [suratsKeluar, setSuratsKeluar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({ show: false, surat: null });
  // letterType is frozen at click-time so tab switches can't flip the preview endpoint
  const [previewModal, setPreviewModal] = useState({ show: false, surat: null, autoPrint: false, letterType: 'incoming' });
  const [reconnectNeeded, setReconnectNeeded] = useState(false);
  // Separate loading flags so a delete operation doesn't put the table into a spinner
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Sync state with URL parameter changes (e.g. browser back/forward).
  // Always reset to list view so a form open for one type is never left
  // mounted when the active type changes underneath it.
  useEffect(() => {
    if (queryType === 'incoming' || queryType === 'outgoing') {
      setActiveTab(queryType);
      setView('list');
      setEditingId(null);
      setSearchTerm('');
      setCurrentMonthOnly(true);
    }
  }, [queryType]);

  // Fetch letters when active tab or month-filter changes
  useEffect(() => {
    fetchData();
  }, [activeTab, currentMonthOnly]);

  // Toast timer auto-close
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Handle escape key to close preview modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = async () => {
    setLoadingList(true);
    setReconnectNeeded(false);
    try {
      if (activeTab === 'incoming') {
        // Pass ?month=current when the toggle is active — server derives the
        // actual year/month from its own clock so the view is never stale.
        const params = currentMonthOnly ? '?month=current' : '';
        const response = await api.get(`/api/surat${params}`);
        setSurats(response.data.data || []);
      } else {
        const response = await api.get('/api/surat-keluar');
        setSuratsKeluar(response.data.surats || response.data.data || []);
      }
    } catch (error) {
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true);
      }
      console.error(`Failed to fetch ${activeTab} letters:`, error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ type: tab });
    setView('list');
    setEditingId(null);
    setSearchTerm('');
    // Reset month filter to default (on) whenever switching back to incoming
    setCurrentMonthOnly(true);
  };

  const handleReconnectGoogle = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    window.location.href = `${API_BASE_URL}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`;
  };

  const getFileUrl = (suratId, letterType, disposition = 'inline') => {
    const token = localStorage.getItem('token');
    const base = `${API_BASE_URL}/api/${letterType === 'incoming' ? 'surat' : 'surat-keluar'}/${suratId}/file`;
    if (disposition === 'attachment') {
      return `${base}?disposition=attachment&token=${encodeURIComponent(token || '')}`;
    }
    return `${base}?token=${encodeURIComponent(token || '')}`;
  };

  const handleView = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) {
      alert('File tidak tersedia');
      return;
    }
    if (surat.google_drive_id) {
      const url = getFileUrl(surat.id, activeTab, 'inline');
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(surat.file_path, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePreview = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) {
      alert('File tidak tersedia untuk preview');
      return;
    }
    window.dispatchEvent(new CustomEvent('collapseSidebar'));
    // Freeze letterType at click-time so tab switches can't change the endpoint
    setPreviewModal({ show: true, surat, autoPrint: false, letterType: activeTab });
  };

  const handleClosePreview = () => {
    setPreviewModal({ show: false, surat: null, autoPrint: false, letterType: 'incoming' });
    window.dispatchEvent(new CustomEvent('expandSidebar'));
  };

  const handleDownload = (surat) => {
    if (!surat.google_drive_id) {
      alert('File tidak tersedia untuk diunduh');
      return;
    }
    const url = getFileUrl(surat.id, activeTab, 'attachment');
    const a = document.createElement('a');
    a.href = url;
    a.download = surat.nama_surat || 'document';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) {
      alert('File tidak tersedia untuk print');
      return;
    }
    window.dispatchEvent(new CustomEvent('collapseSidebar'));
    // Freeze letterType at click-time so tab switches can't change the endpoint
    setPreviewModal({ show: true, surat, autoPrint: true, letterType: activeTab });
  };

  const handleEdit = (surat) => {
    setEditingId(surat.id);
    setView('edit');
  };

  const handleDeleteClick = (surat) => {
    setDeleteModal({ show: true, surat });
  };

  const handleDeleteConfirm = async () => {
    const { surat } = deleteModal;
    if (!surat) return;

    // Use a dedicated delete-loading flag so the table doesn't re-enter spinner state
    setLoadingDelete(true);
    try {
      const endpoint = activeTab === 'incoming' ? `/api/surat/${surat.id}` : `/api/surat-keluar/${surat.id}`;
      const response = await api.delete(endpoint);
      if (response.data.success) {
        if (activeTab === 'incoming') {
          setSurats((prev) => prev.filter((s) => s.id !== surat.id));
        } else {
          setSuratsKeluar((prev) => prev.filter((s) => s.id !== surat.id));
        }
        setToast({
          show: true,
          type: 'success',
          message: response.data.message || 'Surat berhasil dihapus dari aplikasi dan Google Drive.',
        });
      }
    } catch (error) {
      console.error(`Failed to delete ${activeTab} letter:`, error);
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true);
      } else {
        const errorMsg = error.response?.data?.error || 'Record tidak dapat dihapus sepenuhnya karena file Google Drive tidak dapat dihapus.';
        setToast({
          show: true,
          type: 'error',
          message: errorMsg,
        });
      }
    } finally {
      setLoadingDelete(false);
      setDeleteModal({ show: false, surat: null });
    }
  };

  const handleSaved = (type, action) => {
    setView('list');
    setEditingId(null);
    setToast({
      show: true,
      type: 'success',
      message: `Surat ${type === 'incoming' ? 'masuk' : 'keluar'} berhasil ${action === 'created' ? 'ditambahkan' : 'diperbarui'}.`,
    });
    fetchData();
  };

  // Search/Filter logic within active tab (Section 5 requirement)
  const getFilteredLetters = () => {
    const currentList = activeTab === 'incoming' ? surats : suratsKeluar;
    if (!searchTerm.trim()) return currentList;

    const term = searchTerm.toLowerCase();
    return currentList.filter((surat) => {
      const matchNo = surat.nomor_surat?.toLowerCase().includes(term);
      const matchSubject = surat.nama_surat?.toLowerCase().includes(term);
      const matchParty = activeTab === 'incoming'
        ? surat.nama_pengirim?.toLowerCase().includes(term)
        : surat.nama_penerima?.toLowerCase().includes(term);
      return matchNo || matchSubject || matchParty;
    });
  };

  const filteredLetters = getFilteredLetters();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4B164C]">Kelola Surat</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola surat masuk dan keluar secara terpadu di satu tempat.</p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90 self-start sm:self-auto"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            <i className="bi bi-plus-lg" />
            Tambah Surat {activeTab === 'incoming' ? 'Masuk' : 'Keluar'}
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      {view === 'list' && (
        <div className="flex border-b border-slate-100 gap-4">
          <button
            onClick={() => handleTabChange('incoming')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'incoming'
                ? 'border-[#4B164C] text-[#4B164C]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Surat Masuk
          </button>
          <button
            onClick={() => handleTabChange('outgoing')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'outgoing'
                ? 'border-[#4B164C] text-[#4B164C]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Surat Keluar
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {toast.show && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
          toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-3">
            <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-triangle-fill text-red-500' : 'bi-check-circle-fill text-emerald-500'} text-lg`} />
            <span className="font-medium">{toast.message}</span>
          </div>
          <button onClick={() => setToast({ ...toast, show: false })} className="text-slate-400 hover:text-slate-600">
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* Reconnect Google Banner */}
      {reconnectNeeded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Your Google connection needs to be renewed.</p>
              <p className="text-xs text-amber-700">Please reconnect your Google account to sync your letters with Google Drive &amp; Sheets.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReconnectGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <i className="bi bi-google" /> Reconnect Google
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#4B164C] border border-purple-100">
                {(activeTab === 'incoming' ? surats : suratsKeluar).length} Surat
              </span>
              {/* Current-month toggle — only shown on the incoming tab */}
              {activeTab === 'incoming' && (
                <button
                  type="button"
                  onClick={() => setCurrentMonthOnly((v) => !v)}
                  title={currentMonthOnly ? 'Tampilkan semua bulan' : 'Tampilkan bulan ini saja'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    currentMonthOnly
                      ? 'bg-[#4B164C] text-white border-[#4B164C]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#DD88CF] hover:text-[#4B164C]'
                  }`}
                >
                  <i className="bi bi-calendar-month" />
                  {currentMonthOnly
                    ? new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                    : 'Semua Bulan'}
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari nomor, ${activeTab === 'incoming' ? 'pengirim' : 'penerima'}, atau perihal…`}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-[#DD88CF] focus:ring-2 focus:ring-[#DD88CF]/20 transition"
              />
            </div>
          </div>

          {/* Table */}
          <MailTable
            type={activeTab}
            surats={filteredLetters}
            loading={loadingList}
            currentMonthOnly={activeTab === 'incoming' && currentMonthOnly}
            onView={handleView}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        </div>
      ) : (
        <MailForm
          key={`${activeTab}-${editingId ?? 'create'}`}
          type={activeTab}
          id={editingId}
          onSaved={handleSaved}
          onCancel={() => {
            setView('list');
            setEditingId(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, surat: null })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.surat ? deleteModal.surat.nama_surat : ''}
        loading={loadingDelete}
      />

      {/* Document Preview Modal — apiEndpoint uses letterType frozen at click-time */}
      <DocumentPreviewModal
        show={previewModal.show}
        onClose={handleClosePreview}
        surat={previewModal.surat}
        autoPrint={previewModal.autoPrint}
        apiEndpoint={
          previewModal.surat
            ? `/api/${previewModal.letterType === 'incoming' ? 'surat' : 'surat-keluar'}/${previewModal.surat.id}/file`
            : ''
        }
      />
    </div>
  );
}
