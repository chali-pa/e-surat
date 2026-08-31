import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import MailTable from '../components/mail/MailTable';
import MailForm from '../components/mail/MailForm';
import DeleteConfirmDialog from '../components/mail/DeleteConfirmDialog';
import DocumentScanner from '../components/mail/DocumentScanner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ─── helpers ──────────────────────────────────────────────────────────────

const ID_MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

/** Build the query-string portion for month-filtered API calls. */
function buildMonthParams(sel) {
  if (!sel) return '';
  return `?year=${sel.year}&month=${sel.month}`;
}

/** Return the "current month" object using the browser clock. 
 *  The server also validates by its own clock, so this is only used
 *  as the initial default — it is never the source of truth for filtering.
 */
function currentMonthValue() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Pretty-print a { year, month } selection for the toggle pill. */
function monthPillLabel(sel) {
  if (!sel) return 'Semua Bulan';
  return `${ID_MONTHS[sel.month - 1]} ${sel.year}`;
}

/** Build an array of { year, month } options for the last 24 months. */
function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return opts;
}

// ─── component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL routing / tab sync
  const queryType = searchParams.get('type');
  const initialTab = queryType === 'outgoing' ? 'outgoing' : 'incoming';

  const [activeTab, setActiveTab]   = useState(initialTab);
  const [view, setView]             = useState('list'); // 'list' | 'create' | 'edit' | 'scan'
  const [editingId, setEditingId]   = useState(null);
  const [scannedFile, setScannedFile] = useState(null);

  // Dedicated Scanner MFP States
  const [scannerMode, setScannerMode] = useState('camera'); // 'camera' | 'mfp'
  const [scanIdentifier, setScanIdentifier] = useState('');
  const [scannerSettingsOpen, setScannerSettingsOpen] = useState(false);
  const [sseStatus, setSseStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const sseRef = useRef(null);

  const queryView = searchParams.get('view');

  // Helper to handle views navigation with URL parameter sync
  const navigateToView = (newView, paramsUpdate = {}) => {
    setView(newView);
    if (newView === 'list') {
      setEditingId(null);
    }
    const params = new URLSearchParams(searchParams);
    if (newView === 'list') {
      params.delete('view');
    } else {
      params.set('view', newView);
    }
    // Apply optional param updates
    Object.entries(paramsUpdate).forEach(([key, val]) => {
      if (val === null) params.delete(key);
      else params.set(key, val);
    });
    setSearchParams(params);
  };

  // ── Per-tab month selection ──────────────────────────────────────────
  // null  → show all records for that tab
  // { year, month } → server-filtered to that specific month
  // Both tabs default to the current month on first load.
  const [selectedMonthIncoming, setSelectedMonthIncoming] = useState(currentMonthValue);
  const [selectedMonthOutgoing, setSelectedMonthOutgoing] = useState(currentMonthValue);
  // Dropdown open state per tab
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────
  const [surats, setSurats]             = useState([]);
  const [suratsKeluar, setSuratsKeluar] = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');

  // ── Modals / overlays ───────────────────────────────────────────────
  const [deleteModal, setDeleteModal]   = useState({ show: false, surat: null });
  const [previewModal, setPreviewModal] = useState({ show: false, surat: null, autoPrint: false, letterType: 'incoming' });

  // ── Loading flags ────────────────────────────────────────────────────
  const [reconnectNeeded, setReconnectNeeded] = useState(false);
  const [loadingList, setLoadingList]         = useState(true);
  const [loadingDelete, setLoadingDelete]     = useState(false);
  const [loadingPdf, setLoadingPdf]           = useState(false);
  const [loadingExport, setLoadingExport]     = useState(false);

  // ── Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Active month selection for the current tab (convenient shorthand)
  const activeMonthSel = activeTab === 'incoming' ? selectedMonthIncoming : selectedMonthOutgoing;
  const setActiveMonthSel = activeTab === 'incoming' ? setSelectedMonthIncoming : setSelectedMonthOutgoing;

  // ─── Effects ──────────────────────────────────────────────────────────

  // Sync URL ?type= param → tab state
  useEffect(() => {
    if (queryType === 'incoming' || queryType === 'outgoing') {
      setActiveTab(queryType);
      setSearchTerm('');
      setMonthPickerOpen(false);
      // Reset each tab's month selection back to current-month on navigation
      setSelectedMonthIncoming(currentMonthValue());
      setSelectedMonthOutgoing(currentMonthValue());
    }
  }, [queryType]);

  // Sync URL ?view= param → view state
  useEffect(() => {
    if (queryView === 'scan') {
      setView('scan');
      setEditingId(null);
    } else if (queryView === 'create') {
      setView('create');
      setEditingId(null);
    } else if (queryView === 'edit') {
      setView('edit');
    } else {
      setView('list');
      setEditingId(null);
    }
  }, [queryView]);

  // Fetch whenever tab or the active tab's month selection changes
  useEffect(() => {
    fetchData();
    setMonthPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedMonthIncoming, selectedMonthOutgoing]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 5000);
    return () => clearTimeout(t);
  }, [toast.show]);

  // Escape closes preview modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClosePreview(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close month picker when clicking outside
  useEffect(() => {
    if (!monthPickerOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-month-picker]')) setMonthPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [monthPickerOpen]);

  // ─── Scanner Connection and Actions ───────────────────────────────────

  const handleScanDetected = useCallback(async (filename) => {
    try {
      setToast({ show: true, type: 'success', message: 'Dokumen scan baru terdeteksi! Memuat...' });

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      // Fetch scan file as blob
      const response = await api.get(`/api/scan/file`, {
        params: { filename, token },
        responseType: 'blob'
      });

      // Convert to File
      const fileType = response.data.type || 'application/octet-stream';
      const file = new File([response.data], filename.split('/').pop(), { type: fileType });

      // Check size limit (50 MB)
      const MAX_MAIL_UPLOAD_SIZE_MB = 50;
      const limitBytes = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;
      if (file.size > limitBytes) {
        setToast({
          show: true,
          type: 'error',
          message: `Ukuran file scan (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 50 MB.`
        });
        return;
      }

      // Trigger navigation and prepopulate
      setScannedFile(file);
      navigateToView('create');
    } catch (err) {
      console.error('Failed to retrieve scanned file:', err);
      setToast({ show: true, type: 'error', message: 'Gagal mengunduh file scan dari server.' });
    }
  }, [searchParams]);

  const connectSSE = useCallback((identifier) => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    if (!identifier) {
      setSseStatus('disconnected');
      return;
    }

    setSseStatus('connecting');

    const token = localStorage.getItem('token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const streamUrl = `${API_BASE_URL}/api/scan/stream?token=${encodeURIComponent(token || '')}&scanIdentifier=${encodeURIComponent(identifier)}`;

    try {
      const es = new EventSource(streamUrl);
      sseRef.current = es;

      es.onopen = () => {
        setSseStatus('connected');
        console.log('SSE scanner connection established');
      };

      es.onerror = (err) => {
        console.error('SSE scanner connection error:', err);
        setSseStatus('error');
      };

      es.addEventListener('scan-detected', async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Scan detected:', data);
          await handleScanDetected(data.filename);
        } catch (err) {
          console.error('Failed to handle detected scan:', err);
        }
      });
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setSseStatus('error');
    }
  }, [handleScanDetected]);

  // Load scanner settings from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('scannerMode') || 'camera';
    const savedIdent = localStorage.getItem('scanIdentifier') || '';
    setScannerMode(savedMode);
    setScanIdentifier(savedIdent);
  }, []);

  // Sync SSE connection based on scannerMode and scanIdentifier
  useEffect(() => {
    if (scannerMode === 'mfp' && scanIdentifier) {
      connectSSE(scanIdentifier);
    } else {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      setSseStatus('disconnected');
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [scannerMode, scanIdentifier, connectSSE]);

  // Close scanner settings when clicking outside
  useEffect(() => {
    if (!scannerSettingsOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-scanner-settings]')) setScannerSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [scannerSettingsOpen]);

  const handleScanButtonClick = () => {
    if (scannerMode === 'camera') {
      navigateToView('scan');
    } else {
      setScannerSettingsOpen(true);
    }
  };

  // ─── Data fetching ────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoadingList(true);
    setReconnectNeeded(false);
    try {
      if (activeTab === 'incoming') {
        // Use explicit year+month params so the server filters by tanggal_masuk.
        // ?month=current is also valid but year+month gives the frontend full
        // control over which month is shown without depending on the server clock
        // for the month value (the server still validates it independently).
        const params = buildMonthParams(selectedMonthIncoming);
        const response = await api.get(`/api/surat${params}`);
        setSurats(response.data.data || []);
      } else {
        const params = buildMonthParams(selectedMonthOutgoing);
        const response = await api.get(`/api/surat-keluar${params}`);
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

  // ─── Tab switching ────────────────────────────────────────────────────

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setMonthPickerOpen(false);

    // Maintain 'create' view if scanned file exists, otherwise go to list
    const targetView = (view === 'create' && scannedFile) ? 'create' : 'list';

    const params = new URLSearchParams(searchParams);
    params.set('type', tab);
    if (targetView === 'list') {
      params.delete('view');
    } else {
      params.set('view', targetView);
    }
    setSearchParams(params);
  };

  // ─── Month picker actions ─────────────────────────────────────────────

  const handleMonthSelect = (sel) => {
    setActiveMonthSel(sel);
    setMonthPickerOpen(false);
  };

  const handleShowAll = () => {
    setActiveMonthSel(null);
    setMonthPickerOpen(false);
  };

  const handleShowCurrentMonth = () => {
    setActiveMonthSel(currentMonthValue());
    setMonthPickerOpen(false);
  };

  // ─── Monthly PDF download ─────────────────────────────────────────────

  const handleDownloadMonthlyPdf = async () => {
    if (!activeMonthSel) return;
    setLoadingPdf(true);
    try {
      const endpoint = activeTab === 'incoming' ? '/api/surat/monthly-pdf' : '/api/surat-keluar/monthly-pdf';
      const response = await api.get(
        `${endpoint}?year=${activeMonthSel.year}&month=${activeMonthSel.month}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      const monthStr = String(activeMonthSel.month).padStart(2, '0');
      a.href = url;
      a.download = `${activeTab === 'incoming' ? 'surat-masuk' : 'surat-keluar'}-${monthStr}-${activeMonthSel.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal membuat PDF laporan.';
      setToast({ show: true, type: 'error', message: typeof msg === 'string' ? msg : 'Tidak ada data untuk bulan tersebut.' });
    } finally {
      setLoadingPdf(false);
    }
  };

  // ─── Xlsx export (incoming only) ─────────────────────────────────────

  const handleExportXlsx = async () => {
    setLoadingExport(true);
    try {
      const params = buildMonthParams(selectedMonthIncoming);
      const response = await api.get(`/api/surat/export${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const a = document.createElement('a');
      const suffix = selectedMonthIncoming
        ? `${String(selectedMonthIncoming.month).padStart(2,'0')}-${selectedMonthIncoming.year}`
        : 'semua';
      a.href = url;
      a.download = `surat-masuk-${suffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal mengekspor data.';
      setToast({ show: true, type: 'error', message: typeof msg === 'string' ? msg : 'Tidak ada data untuk diekspor.' });
    } finally {
      setLoadingExport(false);
    }
  };

  // ─── Google reconnect ─────────────────────────────────────────────────

  const handleReconnectGoogle = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    window.location.href = `${API_BASE_URL}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`;
  };

  // ─── File URL ─────────────────────────────────────────────────────────

  const getFileUrl = (suratId, letterType, disposition = 'inline') => {
    const token = localStorage.getItem('token');
    const base = `${API_BASE_URL}/api/${letterType === 'incoming' ? 'surat' : 'surat-keluar'}/${suratId}/file`;
    return disposition === 'attachment'
      ? `${base}?disposition=attachment&token=${encodeURIComponent(token || '')}`
      : `${base}?token=${encodeURIComponent(token || '')}`;
  };

  // ─── Table action handlers ────────────────────────────────────────────

  const handleView = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) { alert('File tidak tersedia'); return; }
    const url = surat.google_drive_id
      ? getFileUrl(surat.id, activeTab, 'inline')
      : surat.file_path;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePreview = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) { alert('File tidak tersedia untuk preview'); return; }
    window.dispatchEvent(new CustomEvent('collapseSidebar'));
    setPreviewModal({ show: true, surat, autoPrint: false, letterType: activeTab });
  };

  const handleClosePreview = () => {
    setPreviewModal({ show: false, surat: null, autoPrint: false, letterType: 'incoming' });
    window.dispatchEvent(new CustomEvent('expandSidebar'));
  };

  const handleDownloadFile = (surat) => {
    if (!surat.google_drive_id) { alert('File tidak tersedia untuk diunduh'); return; }
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
    if (!surat.google_drive_id && !surat.file_path) { alert('File tidak tersedia untuk print'); return; }
    window.dispatchEvent(new CustomEvent('collapseSidebar'));
    setPreviewModal({ show: true, surat, autoPrint: true, letterType: activeTab });
  };

  const handleEdit = (surat) => {
    setEditingId(surat.id);
    navigateToView('edit');
  };
  const handleDeleteClick = (surat) => setDeleteModal({ show: true, surat });

  const handleDeleteConfirm = async () => {
    const { surat } = deleteModal;
    if (!surat) return;
    setLoadingDelete(true);
    try {
      const endpoint = activeTab === 'incoming' ? `/api/surat/${surat.id}` : `/api/surat-keluar/${surat.id}`;
      const response = await api.delete(endpoint);
      if (response.data.success) {
        if (activeTab === 'incoming') setSurats((p) => p.filter((s) => s.id !== surat.id));
        else setSuratsKeluar((p) => p.filter((s) => s.id !== surat.id));
        setToast({ show: true, type: 'success', message: response.data.message || 'Surat berhasil dihapus.' });
      }
    } catch (error) {
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true);
      } else {
        setToast({ show: true, type: 'error', message: error.response?.data?.error || 'Gagal menghapus surat.' });
      }
    } finally {
      setLoadingDelete(false);
      setDeleteModal({ show: false, surat: null });
    }
  };

  const handleCapturedDocument = (file) => {
    setScannedFile(file);
    navigateToView('create');
  };

  const handleCancelCreate = () => {
    setScannedFile(null);
    navigateToView('list');
  };

  const handleSaved = (type, action) => {
    navigateToView('list');
    setEditingId(null);
    setScannedFile(null);
    setToast({
      show: true, type: 'success',
      message: `Surat ${type === 'incoming' ? 'masuk' : 'keluar'} berhasil ${action === 'created' ? 'ditambahkan' : 'diperbarui'}.`,
    });
    fetchData();
  };

  // ─── Search filter (client-side over already-fetched page) ───────────

  const filteredLetters = (() => {
    const list = activeTab === 'incoming' ? surats : suratsKeluar;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((s) => {
      return (
        s.nomor_surat?.toLowerCase().includes(term) ||
        s.nama_surat?.toLowerCase().includes(term) ||
        (activeTab === 'incoming' ? s.nama_pengirim : s.nama_penerima)?.toLowerCase().includes(term)
      );
    });
  })();

  const totalCount = (activeTab === 'incoming' ? surats : suratsKeluar).length;

  // ─── Month picker dropdown ────────────────────────────────────────────

  const monthOptions = buildMonthOptions();

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4B164C]">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola surat masuk dan keluar secara terpadu di satu tempat.</p>
        </div>
        {view === 'list' && (
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button
              onClick={handleScanButtonClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-700 bg-white border border-slate-200 text-sm font-semibold shadow-sm transition hover:bg-slate-50 cursor-pointer min-h-[44px]"
            >
              <i className={`bi ${scannerMode === 'mfp' ? 'bi-printer-fill' : 'bi-camera-fill'} text-[#4B164C]`} />
              Pindai Dokumen
            </button>
            <button
              onClick={() => navigateToView('create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90 cursor-pointer min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              <i className="bi bi-plus-lg" />
              Tambah Surat {activeTab === 'incoming' ? 'Masuk' : 'Keluar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Tab Switcher ─────────────────────────────────────────────── */}
      {(view === 'list' || (view === 'create' && scannedFile)) && (
        <div className="flex border-b border-slate-100 gap-4">
          {[
            { id: 'incoming', label: 'Surat Masuk' },
            { id: 'outgoing', label: 'Surat Keluar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#4B164C] text-[#4B164C]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast.show && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md ${
          toast.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
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

      {/* ── Google Reconnect Banner ───────────────────────────────────── */}
      {reconnectNeeded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Your Google connection needs to be renewed.</p>
              <p className="text-xs text-amber-700">Please reconnect your Google account to sync with Google Drive &amp; Sheets.</p>
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

      {/* ── Main Content ─────────────────────────────────────────────── */}
      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[420px] max-h-[calc(100vh-16rem)]">

          {/* ── Toolbar ────────────────────────────────────────────── */}
          <div className="flex-none px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col gap-3">

            {/* Row 1: badges · scanner · month-picker · [spacer] · export actions
                Wraps naturally on narrow viewports — each pill is a self-contained
                flex item with its own relative positioning for its dropdown. */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Total badge */}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">Total</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#4B164C] border border-purple-100 shrink-0">
                {totalCount} Surat
              </span>

              {/* ── Scanner settings pill ─────────────────────────── */}
              <div className="relative shrink-0" data-scanner-settings>
                <button
                  type="button"
                  onClick={() => setScannerSettingsOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px] ${
                    scannerMode === 'mfp'
                      ? sseStatus === 'connected'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : sseStatus === 'connecting'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : sseStatus === 'error'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-[#4B164C] text-white border-[#4B164C]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#DD88CF] hover:text-[#4B164C]'
                  }`}
                  title="Pengaturan Scanner"
                >
                  <i className={`bi ${scannerMode === 'mfp' ? 'bi-printer' : 'bi-camera'} text-sm`} />
                  <span className="max-w-[140px] truncate">
                    {scannerMode === 'mfp'
                      ? `MFP: ${scanIdentifier || 'Belum diatur'}`
                      : 'Scanner: Kamera'}
                  </span>
                  <i className={`bi bi-chevron-${scannerSettingsOpen ? 'up' : 'down'} text-[10px] shrink-0`} />
                </button>

                {scannerSettingsOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)] text-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pengaturan Scanner</h4>

                    {/* Mode selector */}
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-semibold text-slate-500">Mode Pemindai</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => { setScannerMode('camera'); localStorage.setItem('scannerMode', 'camera'); }}
                          className={`py-1.5 text-xs font-bold rounded-lg transition ${scannerMode === 'camera' ? 'bg-white text-[#4B164C] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Kamera
                        </button>
                        <button
                          type="button"
                          onClick={() => { setScannerMode('mfp'); localStorage.setItem('scannerMode', 'mfp'); }}
                          className={`py-1.5 text-xs font-bold rounded-lg transition ${scannerMode === 'mfp' ? 'bg-white text-[#4B164C] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Scanner MFP
                        </button>
                      </div>
                    </div>

                    {/* MFP identifier + status */}
                    {scannerMode === 'mfp' && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <label htmlFor="scanIdentInput" className="block text-xs font-semibold text-slate-500">
                            Identitas Scan (Prefix/Folder)
                          </label>
                          <input
                            id="scanIdentInput"
                            type="text"
                            value={scanIdentifier}
                            onChange={(e) => {
                              setScanIdentifier(e.target.value);
                              localStorage.setItem('scanIdentifier', e.target.value);
                            }}
                            placeholder="Contoh: john_ atau john"
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#4B164C]"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                            Nama folder atau awalan nama file scan yang diatur di printer MFP Anda.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            sseStatus === 'connected'   ? 'bg-emerald-500 animate-pulse' :
                            sseStatus === 'connecting'  ? 'bg-amber-500 animate-pulse'  :
                            sseStatus === 'error'       ? 'bg-red-500'                  :
                                                          'bg-slate-300'
                          }`} />
                          <span className="font-medium text-slate-600">
                            {sseStatus === 'connected'  ? 'Terhubung, Menunggu Scan...' :
                             sseStatus === 'connecting' ? 'Menghubungkan...'            :
                             sseStatus === 'error'      ? 'Koneksi gagal'               :
                                                          'Terputus'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Month-filter pill ─────────────────────────────── */}
              <div className="relative shrink-0" data-month-picker>
                <button
                  type="button"
                  onClick={() => setMonthPickerOpen((v) => !v)}
                  aria-expanded={monthPickerOpen}
                  aria-haspopup="listbox"
                  title="Filter berdasarkan bulan"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px] min-w-[130px] ${
                    activeMonthSel
                      ? 'bg-[#4B164C] text-white border-[#4B164C]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#DD88CF] hover:text-[#4B164C]'
                  }`}
                >
                  <i className="bi bi-calendar-month shrink-0" />
                  <span className="truncate">{monthPillLabel(activeMonthSel)}</span>
                  <i className={`bi bi-chevron-${monthPickerOpen ? 'up' : 'down'} text-[10px] shrink-0`} />
                </button>

                {monthPickerOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 w-56 max-w-[calc(100vw-2rem)]"
                  >
                    <div className="border-b border-gray-100 pb-1.5 mb-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={handleShowCurrentMonth}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4B164C] hover:bg-purple-50 rounded-lg flex items-center gap-2 min-h-[36px]"
                      >
                        <i className="bi bi-calendar-check" /> Bulan Ini
                      </button>
                      <button
                        type="button"
                        onClick={handleShowAll}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg flex items-center gap-2 min-h-[36px]"
                      >
                        <i className="bi bi-calendar3" /> Semua Bulan
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {monthOptions.map((opt) => {
                        const isActive = activeMonthSel?.year === opt.year && activeMonthSel?.month === opt.month;
                        return (
                          <button
                            key={`${opt.year}-${opt.month}`}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => handleMonthSelect(opt)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition min-h-[36px] ${
                              isActive
                                ? 'bg-[#4B164C] text-white font-semibold'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{ID_MONTHS[opt.month - 1]} {opt.year}</span>
                            {isActive && <i className="bi bi-check2 text-xs" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Spacer — pushes export actions to the right on wider screens */}
              <span className="flex-1" />

              {/* ── Export actions ────────────────────────────────── */}
              {activeMonthSel && (
                <button
                  type="button"
                  onClick={handleDownloadMonthlyPdf}
                  disabled={loadingPdf || totalCount === 0}
                  title={totalCount === 0 ? 'Tidak ada data untuk bulan ini' : `Unduh laporan PDF ${monthPillLabel(activeMonthSel)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[36px] shrink-0"
                >
                  {loadingPdf
                    ? <svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <i className="bi bi-file-earmark-pdf shrink-0" />}
                  <span className="hidden sm:inline">{loadingPdf ? 'Membuat…' : 'Laporan PDF'}</span>
                </button>
              )}

              {activeTab === 'incoming' && (
                <button
                  type="button"
                  onClick={handleExportXlsx}
                  disabled={loadingExport || totalCount === 0}
                  title={totalCount === 0 ? 'Tidak ada data untuk diekspor' : 'Export data ke Excel'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[36px] shrink-0"
                >
                  {loadingExport
                    ? <svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <i className="bi bi-file-earmark-excel shrink-0" />}
                  <span className="hidden sm:inline">Excel</span>
                </button>
              )}
            </div>

            {/* Row 2: search — full-width on mobile, right-aligned fixed width on sm+ */}
            <div className="relative w-full sm:w-72 sm:self-end">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari nomor, ${activeTab === 'incoming' ? 'pengirim' : 'penerima'}, atau perihal…`}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-[#DD88CF] focus:ring-2 focus:ring-[#DD88CF]/20 transition"
              />
            </div>
          </div>

          {/* ── Table area — overflow-hidden here (not on card root) clips the
               table cleanly at the card's bottom rounded corner while leaving
               the toolbar dropdowns free to overflow above. ──────────────── */}
          <div className="flex-1 overflow-hidden rounded-b-2xl">
            <MailTable
              type={activeTab}
              surats={filteredLetters}
              loading={loadingList}
              currentMonthOnly={!!activeMonthSel}
              onView={handleView}
              onPreview={handlePreview}
              onDownload={handleDownloadFile}
              onPrint={handlePrint}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          </div>
        </div>
      ) : view === 'scan' ? (
        <DocumentScanner
          onCapture={handleCapturedDocument}
          onCancel={handleCancelCreate}
        />
      ) : (
        <MailForm
          key={`${activeTab}-${editingId ?? 'create'}`}
          type={activeTab}
          id={editingId}
          prepopulatedFile={scannedFile}
          onClearFile={() => setScannedFile(null)}
          onSaved={handleSaved}
          onCancel={handleCancelCreate}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, surat: null })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.surat?.nama_surat ?? ''}
        loading={loadingDelete}
      />

      {/* Document Preview — letterType frozen at click-time */}
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
