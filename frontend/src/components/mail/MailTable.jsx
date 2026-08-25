import React from 'react';

export default function MailTable({
  type,
  surats,
  loading,
  onView,
  onPreview,
  onDownload,
  onPrint,
  onEdit,
  onDelete
}) {
  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <i className="bi bi-arrow-repeat text-4xl mb-3 block animate-spin" />
          Memuat data...
        </div>
      ) : (
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="bg-[#FAF7FC]">
              <th className="w-12 text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Nomor Surat</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Perihal</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                {type === 'incoming' ? 'Pengirim' : 'Penerima'}
              </th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Folder</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Tgl Buat</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                {type === 'incoming' ? 'Tgl Masuk' : 'Tgl Keluar'}
              </th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {surats.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-16 text-slate-400">
                  <i className="bi bi-inbox text-4xl block mb-3 text-slate-300" />
                  <p className="text-sm">Tidak ada data surat {type === 'incoming' ? 'masuk' : 'keluar'}</p>
                </td>
              </tr>
            ) : (
              surats.map((surat, index) => (
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
                  <td className="py-3 px-4 text-sm text-slate-700">{surat.nama_surat}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {type === 'incoming' ? surat.nama_pengirim : surat.nama_penerima}
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
                    {surat.tanggal_buat ? new Date(surat.tanggal_buat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {type === 'incoming'
                      ? (surat.tanggal_masuk ? new Date(surat.tanggal_masuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
                      : (surat.tanggal_keluar ? new Date(surat.tanggal_keluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
