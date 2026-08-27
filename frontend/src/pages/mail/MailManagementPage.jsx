import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import MailTable from '../../components/mail/MailTable';
import MailForm from '../../components/mail/MailForm';
import DeleteConfirmDialog from '../../components/mail/DeleteConfirmDialog';
import SendEmailModal from '../../components/mail/SendEmailModal';

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

export default function MailManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL routing / tab sync
  const queryType = searchParams.get('type');
  const initialTab = queryType === 'outgoing' ? 'outgoing' : 'incoming';

  const [activeTab, setActiveTab]   = useState(initialTab);
  const [view, setView]             = useState('list'); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId]   = useState(null);

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
  const [emailModal, setEmailModal]     = useState({ show: false, surat: null, letterType: 'incoming' });

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

  // Sync URL ?type= param → tab state, always reset to list
  useEffect(() => {
    if (queryType === 'incoming' || queryType === 'outgoing') {
      setActiveTab(queryType);
      setView('list');
      setEditingId(null);
      setSearchTerm('');
      setMonthPickerOpen(false);
      // Reset each tab's month selection back to current-month on navigation
      setSelectedMonthIncoming(currentMonthValue());
      setSelectedMonthOutgoing(currentMonthValue());
    }
  }, [queryType]);

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
    setSearchParams({ type: tab });
    setView('list');
    setEditingId(null);
    setSearchTerm('');
    setMonthPickerOpen(false);
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

  const handleEdit = (surat) => { setEditingId(surat.id); setView('edit'); };
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

  const handleSaved = (type, action) => {
    setView('list');
    setEditingId(null);
    setToast({
      show: true, type: 'success',
      message: `Surat ${type === 'incoming' ? 'masuk' : 'keluar'} berhasil ${action === 'created' ? 'ditambahkan' : 'diperbarui'}.`,
    });
    fetchData();
  };

  const handleSendEmail = (surat) => {
    setEmailModal({
      show: true,
      surat,
      letterType: previewModal.show ? previewModal.letterType : activeTab,
    });
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

      {/* ── Tab Switcher ─────────────────────────────────────────────── */}
      {view === 'list' && (
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-6 py-4 border-b border-gray-100">
            {/* Row 1: count + month picker + action buttons */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Total badge */}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#4B164C] border border-purple-100">
                {totalCount} Surat
              </span>

              {/* ── Month picker ──────────────────────────────────── */}
              <div className="relative" data-month-picker>
                <button
                  type="button"
                  onClick={() => setMonthPickerOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    activeMonthSel
                      ? 'bg-[#4B164C] text-white border-[#4B164C]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#DD88CF] hover:text-[#4B164C]'
                  }`}
                  title="Pilih bulan"
                >
                  <i className="bi bi-calendar-month" />
                  {monthPillLabel(activeMonthSel)}
                  <i className={`bi bi-chevron-${monthPickerOpen ? 'up' : 'down'} text-[10px]`} />
                </button>

                {monthPickerOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 w-60">
                    {/* Show all / current month shortcuts */}
                    <div className="border-b border-gray-100 pb-1.5 mb-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={handleShowCurrentMonth}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#4B164C] hover:bg-purple-50 rounded-lg flex items-center gap-2"
                      >
                        <i className="bi bi-calendar-check" /> Bulan Ini
                      </button>
                      <button
                        type="button"
                        onClick={handleShowAll}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                      >
                        <i className="bi bi-calendar3" /> Semua Bulan
                      </button>
                    </div>
                    {/* Scrollable month list */}
                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                      {monthOptions.map((opt) => {
                        const isActive = activeMonthSel?.year === opt.year && activeMonthSel?.month === opt.month;
                        return (
                          <button
                            key={`${opt.year}-${opt.month}`}
                            type="button"
                            onClick={() => handleMonthSelect(opt)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition ${
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

              {/* Spacer */}
              <span className="flex-1" />

              {/* ── Monthly PDF button (shown only when a month is selected) ── */}
              {activeMonthSel && (
                <button
                  type="button"
                  onClick={handleDownloadMonthlyPdf}
                  disabled={loadingPdf || totalCount === 0}
                  title={totalCount === 0 ? 'Tidak ada data untuk bulan ini' : `Unduh laporan PDF ${monthPillLabel(activeMonthSel)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {loadingPdf ? (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <i className="bi bi-file-earmark-pdf" />
                  )}
                  {loadingPdf ? 'Membuat…' : 'Laporan PDF'}
                </button>
              )}

              {/* ── Xlsx Export button (incoming tab only) ─────────── */}
              {activeTab === 'incoming' && (
                <button
                  type="button"
                  onClick={handleExportXlsx}
                  disabled={loadingExport || totalCount === 0}
                  title={totalCount === 0 ? 'Tidak ada data untuk diekspor' : `Ekspor data ke Excel${activeMonthSel ? ` (${monthPillLabel(activeMonthSel)})` : ' (semua)'}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {loadingExport ? (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <i className="bi bi-file-earmark-excel" />
                  )}
                  {loadingExport ? 'Mengekspor…' : 'Ekspor Excel'}
                </button>
              )}
            </div>

            {/* Row 2: Search */}
            <div className="relative w-full sm:w-72 self-end">
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
            // Pass the active selection so MailTable knows when to show the
            // enhanced date+time column (any month filter active = richer display)
            currentMonthOnly={!!activeMonthSel}
            onView={handleView}
            onPreview={handlePreview}
            onDownload={handleDownloadFile}
            onPrint={handlePrint}
            onSendEmail={handleSendEmail}
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
          onCancel={() => { setView('list'); setEditingId(null); }}
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
        onSendEmail={handleSendEmail}
        apiEndpoint={
          previewModal.surat
            ? `/api/${previewModal.letterType === 'incoming' ? 'surat' : 'surat-keluar'}/${previewModal.surat.id}/file`
            : ''
        }
      />

      {/* Send Email Modal */}
      <SendEmailModal
        show={emailModal.show}
        onClose={() => setEmailModal({ show: false, surat: null, letterType: activeTab })}
        surat={emailModal.surat}
        letterType={emailModal.letterType}
        onSuccess={(msg) => setToast({ show: true, type: 'success', message: msg })}
        onError={(err) => setToast({ show: true, type: 'error', message: err })}
      />
    </div>
  );
}
