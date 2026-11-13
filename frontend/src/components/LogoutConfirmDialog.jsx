import React from 'react';

export default function LogoutConfirmDialog({ isOpen, onClose, onConfirm, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* Icon — purple/neutral, not red, because logout is not a destructive action */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #f3e8f7 0%, #e9d5f0 100%)' }}
        >
          <i className="bi bi-box-arrow-right text-xl text-[#4B164C]" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
          Keluar dari akun?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Anda perlu masuk kembali untuk mengakses surat dan data Drive Anda.
        </p>

        <div className="flex gap-3">
          {/* Cancel — always available unless mid-flight */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition text-sm disabled:opacity-50 min-h-[44px]"
          >
            Batal
          </button>

          {/* Confirm — primary purple gradient, not danger red */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl text-white font-semibold transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            {loading ? (
              <><i className="bi bi-arrow-repeat animate-spin" /> Keluar...</>
            ) : (
              <><i className="bi bi-box-arrow-right" /> Ya, Keluar</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
