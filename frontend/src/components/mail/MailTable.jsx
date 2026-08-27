import React from 'react';

/**
 * Format a date-only string (YYYY-MM-DD) as a localised date.
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format an ISO timestamp string as date + time.
 * Example output: "15 Mar 2026, 09:42"
 */
function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart}, ${timePart}`;
}

/**
 * Shared action-button strip used in both the table row and the mobile card.
 * All six action buttons: view, preview, download, print, edit, delete.
 */
function ActionButtons({ surat, onView, onPreview, onDownload, onPrint, onSendEmail, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onView(surat)}
        title="Lihat file langsung"
        aria-label="View document"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-[#4B164C] border border-purple-200 hover:bg-[#4B164C] hover:text-white hover:border-[#4B164C] transition"
      >
        <i className="bi bi-box-arrow-up-right text-xs" />
      </button>
      <button
        onClick={() => onPreview(surat)}
        title="Preview file"
        aria-label="Preview dokumen"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition"
      >
        <i className="bi bi-eye text-xs" />
      </button>
      <button
        onClick={() => onDownload(surat)}
        title="Unduh file"
        aria-label="Download document"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition"
      >
        <i className="bi bi-download text-xs" />
      </button>
      <button
        onClick={() => onPrint(surat)}
        title="Print dokumen"
        aria-label="Print document"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 transition"
      >
        <i className="bi bi-printer text-xs" />
      </button>
      {onSendEmail && (
        <button
          onClick={() => onSendEmail(surat)}
          title="Kirim via Email"
          aria-label="Kirim surat via email"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition"
        >
          <i className="bi bi-envelope-at text-xs" />
        </button>
      )}
      <button
        onClick={() => onEdit(surat)}
        title="Edit surat"
        aria-label="Edit surat"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition"
      >
        <i className="bi bi-pencil text-xs" />
      </button>
      <button
        onClick={() => onDelete(surat)}
        title="Hapus surat"
        aria-label="Hapus surat"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition"
      >
        <i className="bi bi-trash text-xs" />
      </button>
    </div>
  );
}

export default function MailTable({
  type,
  surats,
  loading,
  /**
   * currentMonthOnly — when true (month filter active) the date column shows
   * full date+time (tanggal_masuk/keluar + created_at timestamp).
   */
  currentMonthOnly = false,
  onView,
  onPreview,
  onDownload,
  onPrint,
  onSendEmail,
  onEdit,
  onDelete,
}) {
  const colSpan = 8;
  const dateLabel = type === 'incoming' ? 'Tgl Masuk' : 'Tgl Keluar';
  const nameLabel = type === 'incoming' ? 'Pengirim' : 'Penerima';

  const getDateValue = (surat) =>
    type === 'incoming' ? surat.tanggal_masuk : surat.tanggal_keluar;

  const getNameValue = (surat) =>
    type === 'incoming' ? surat.nama_pengirim : surat.nama_penerima;

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400">
        <i className="bi bi-arrow-repeat text-4xl mb-3 block animate-spin" />
        Memuat data...
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (surats.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <i className="bi bi-inbox text-4xl block mb-3 text-slate-300" />
        <p className="text-sm">Tidak ada data surat {type === 'incoming' ? 'masuk' : 'keluar'}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile card list — shown below sm breakpoint only ────────── */}
      <div className="sm:hidden divide-y divide-gray-50">
        {surats.map((surat, index) => (
          <div key={surat.id} className="px-4 py-4 space-y-3">
            {/* Card header: index badge + letter number + date */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex-shrink-0">
                  {index + 1}
                </span>
                <span className="font-semibold text-[#4B164C] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg text-xs truncate">
                  {surat.nomor_surat}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0 pt-0.5">
                {formatDate(getDateValue(surat))}
              </span>
            </div>

            {/* Subject */}
            <p className="text-sm font-medium text-slate-800 leading-snug">
              {surat.nama_surat}
            </p>

            {/* Meta row: sender/recipient + folder */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <i className="bi bi-person text-slate-400" />
                {getNameValue(surat) || '-'}
              </span>
              {surat.folder_name ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-[#4B164C] border border-purple-100 font-medium">
                  <i className="bi bi-folder text-[10px]" />
                  {surat.folder_name}
                </span>
              ) : (
                <span className="text-slate-300 italic">Default</span>
              )}
              {currentMonthOnly && surat.created_at && (
                <span className="flex items-center gap-1 text-slate-400">
                  <i className="bi bi-clock text-[10px]" />
                  {formatDateTime(surat.created_at)}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <ActionButtons
              surat={surat}
              onView={onView}
              onPreview={onPreview}
              onDownload={onDownload}
              onPrint={onPrint}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>

      {/* ── Desktop/tablet table — shown sm and above ─────────────────
           Wrapped in overflow-x-auto so wide tables scroll horizontally
           within the card rather than pushing the page layout.           */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="bg-[#FAF7FC]">
              <th className="w-12 text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Nomor Surat</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Perihal</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                {nameLabel}
              </th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Folder</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Tgl Buat</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                {dateLabel}
                {currentMonthOnly && (
                  <i className="bi bi-clock ml-1 text-[#4B164C] opacity-60" title="Menampilkan tanggal dan waktu pencatatan" />
                )}
              </th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {surats.map((surat, index) => (
              <tr key={surat.id} className="hover:bg-purple-50/30 transition">
                <td className="text-center py-3 px-4">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-[#4B164C] bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg text-xs inline-block">
                    {surat.nomor_surat}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-700 max-w-[200px] truncate" title={surat.nama_surat}>
                  {surat.nama_surat}
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">
                  {getNameValue(surat)}
                </td>
                <td className="py-3 px-4 text-sm">
                  {surat.folder_name ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-[#4B164C] border border-purple-100">
                      <i className="bi bi-folder mr-1.5" />
                      {surat.folder_name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Default</span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">
                  {formatDate(surat.tanggal_buat)}
                </td>
                <td className="py-3 px-4 text-sm">
                  {type === 'incoming' ? (
                    currentMonthOnly ? (
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-700">
                          {formatDate(surat.tanggal_masuk)}
                        </div>
                        {surat.created_at && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <i className="bi bi-clock text-[10px]" />
                            {formatDateTime(surat.created_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">{formatDate(surat.tanggal_masuk)}</span>
                    )
                  ) : (
                    <span className="text-slate-500">{formatDate(surat.tanggal_keluar)}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ActionButtons
                      surat={surat}
                      onView={onView}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      onPrint={onPrint}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
