import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

/**
 * SendEmailModal
 *
 * Modal component for sending a letter PDF via email directly from the app.
 * Supports incoming ('incoming' / 'masuk') and outgoing ('outgoing' / 'keluar') letters.
 */
export default function SendEmailModal({
  show,
  onClose,
  surat,
  letterType = 'incoming', // 'incoming' | 'outgoing' | 'masuk' | 'keluar'
  onSuccess,
  onError,
}) {
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset or pre-fill recipient when modal opens with a new letter
  useEffect(() => {
    if (show && surat) {
      setValidationError('');
      setMessage('');

      // Pre-fill recipient if letter object has an email field or if penerima contains an email format
      let initialEmail = surat.email_penerima || surat.email_pengirim || '';
      if (!initialEmail) {
        const partyName = surat.penerima || surat.nama_pengirim || '';
        const emailMatch = partyName.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          initialEmail = emailMatch[0];
        }
      }
      setRecipients(initialEmail);
    }
  }, [show, surat]);

  if (!show || !surat) return null;

  const isOutgoing = letterType === 'outgoing' || letterType === 'keluar';
  const typeTitle = isOutgoing ? 'Surat Keluar' : 'Surat Masuk';
  const partyLabel = isOutgoing ? 'Penerima' : 'Pengirim';
  const partyName = isOutgoing
    ? surat.penerima || surat.nama_penerima || '-'
    : surat.nama_pengirim || surat.pengirim || '-';
  const perihal = isOutgoing
    ? surat.perihal || surat.nama_surat || '-'
    : surat.nama_surat || surat.perihal || '-';

  const validateEmails = (input) => {
    const list = input
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (list.length === 0) {
      return 'Alamat email penerima wajib diisi.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of list) {
      if (!emailRegex.test(email)) {
        return `Format alamat email "${email}" tidak valid.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const err = validateEmails(recipients);
    if (err) {
      setValidationError(err);
      return;
    }

    setLoading(true);

    try {
      const endpoint = isOutgoing
        ? `/api/surat-keluar/${surat.id}/send-email`
        : `/api/surat/${surat.id}/send-email`;

      const response = await api.post(endpoint, {
        recipients,
        message,
      });

      const successMsg = response.data.message || 'Email surat berhasil dikirim.';
      if (onSuccess) onSuccess(successMsg);
      onClose();
    } catch (error) {
      console.error('[SendEmailModal] Send email failed:', error);
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Gagal mengirim email. Silakan periksa konfigurasi SMTP server.';
      
      setValidationError(errMsg);
      if (onError) onError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, #4B164C0A 0%, #DD88CF0F 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#4B164C]/10 text-[#4B164C] flex items-center justify-center text-lg">
              <i className="bi bi-envelope-paper-fill" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Kirim Surat via Email</h3>
              <p className="text-xs text-slate-500">{typeTitle} No. {surat.nomor_surat || '-'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="font-medium text-slate-400">Nomor Surat:</span>
              <span className="font-semibold text-slate-700">{surat.nomor_surat || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-400">Perihal:</span>
              <span className="font-medium text-slate-700 max-w-[240px] truncate">{perihal}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-400">{partyLabel}:</span>
              <span className="font-medium text-slate-700">{partyName}</span>
            </div>
          </div>

          {/* Validation Banner */}
          {validationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <i className="bi bi-exclamation-triangle-fill text-red-500 mt-0.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Recipient Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Email Penerima <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="contoh: penerima@domain.com, arsip@domain.com"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4B164C] focus:ring-2 focus:ring-[#4B164C]/10 transition"
              disabled={loading}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Gunakan koma (,) untuk mengirim ke lebih dari satu alamat email.
            </p>
          </div>

          {/* Custom Message Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pesan Tambahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan catatan atau pengantar tambahan untuk penerima..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4B164C] focus:ring-2 focus:ring-[#4B164C]/10 transition"
              disabled={loading}
            />
          </div>

          {/* Info Badge */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-700">
            <i className="bi bi-info-circle-fill text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              Dokumen PDF $\le 10\text{ MB}$ akan dilampirkan langsung pada email. File $> 10\text{ MB}$ akan dikirim via tautan Google Drive secara otomatis.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition hover:opacity-95"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Mengirim Email...
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill" />
                  Kirim Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
