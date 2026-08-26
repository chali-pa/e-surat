import React from 'react';

export default function DeleteConfirmDialog({ isOpen, onClose, onConfirm, itemName, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <i className="bi bi-trash text-xl text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Hapus Surat?</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Apakah Anda yakin ingin menghapus <strong className="text-gray-700">{itemName}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition text-sm disabled:opacity-55 min-h-[44px]"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition text-sm flex items-center justify-center gap-2 disabled:opacity-55 min-h-[44px]"
          >
            {loading && <i className="bi bi-arrow-repeat animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
