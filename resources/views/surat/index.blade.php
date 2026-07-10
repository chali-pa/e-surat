<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manajemen Surat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

    <style>
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }

          /* Sidebar Styling */
        #sidebar { transition: width 0.3s; width: 260px; position: fixed; height: 100vh; z-index: 100; background-color: #ffffff; border-right: 1px solid #e5e7eb; }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

        /* Toolbar Select & Search Baru */
        .table-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #E5E7EB;
        }

        .toolbar-select {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #374151;
            font-size: 0.95rem;
        }

        .toolbar-select select {
            min-width: 4.5rem;
            padding: 0.55rem 0.75rem;
            border: 1px solid #D1D5DB;
            border-radius: 0.75rem;
            background: #ffffff;
            color: #111827;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .toolbar-select select:focus {
            border-color: #A5B4FC;
            box-shadow: 0 0 0 4px rgba(165, 180, 252, 0.12);
        }

        .toolbar-search {
            max-width: 260px;
            width: 100%;
        }

        .search-input {
            width: 100%;
            min-height: 44px;
            padding: 0.9rem 1rem 0.9rem 3rem;
            border: 1px solid #D1D5DB;
            border-radius: 0.75rem;
            background: #ffffff;
            color: #111827;
            font-size: 0.95rem;
            transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .search-input:focus {
            outline: none;
            border-color: #A5B4FC;
            box-shadow: 0 0 0 4px rgba(165, 180, 252, 0.14);
        }

        .search-icon {
            position: absolute;
            left: 0.95rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1rem;
            color: #6B7280;
        }

        .transactions-card { background: #ffffff; border-radius: 28px; padding: 20px 24px; border: 1px solid #e5e7eb; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06); overflow: hidden; }
        .transactions-table { width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; margin-top: -4px; border-radius: 22px; overflow: hidden; }
        .transactions-table thead tr { background: #eef2ff !important; }
        .transactions-table thead th {
            color: #475569 !important;
            font-weight: 600 !important;
            padding: 18px 20px !important;
            text-transform: none !important;
            border: none !important;
            font-size: 0.85rem !important;
            letter-spacing: 0.01em !important;
        }
        .transactions-table thead th:first-child { text-align: center !important; }
        .transactions-table tbody tr { border-bottom: 1px solid rgba(148,163,184,0.16); }
        .transactions-table tbody tr:hover { background: #f8fafc; }
        .transactions-table tbody tr:last-child td { border-bottom: none !important; }
        .transactions-table tbody td {
            padding: 18px 20px !important;
            color: #475569 !important;
            font-size: 0.95rem !important;
            vertical-align: middle !important;
        }
        .transactions-table tbody td:first-child { text-align: center !important; }
        .transactions-table tbody td:last-child { text-align: right !important; }

        .action-wrapper { display: inline-flex; gap: 10px; align-items: center; justify-content: flex-end; }
        .action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            color: #475569;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            transition: background 150ms ease, transform 150ms ease, color 150ms ease;
        }
        .action-btn:hover { background: #4B164C; color: white; border-color: #4B164C; transform: scale(1.05); }

        /* Hide Default DataTable Controls */
        .dataTables_wrapper .dataTables_filter,
        .dataTables_wrapper .dataTables_length { 
            display: none !important; 
        }
        
        @media (max-width: 640px) {
            .table-toolbar { flex-direction: column; align-items: stretch; }
            .toolbar-search { max-width: 100%; }
        }
    </style>
</head>
<body>

    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4">
            <button id="toggleBtn" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
            <span class="ml-3 font-bold text-[#4B164C] text-lg menu-text">E-Surat</span>
        </div>
        <nav class="flex-1 p-3 space-y-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-grid-1x2-fill text-lg"></i><span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C]">
                <i class="bi bi-envelope-fill text-lg"></i><span class="ml-4 menu-text">Kelola Surat</span>
            </a>
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-person-fill text-lg"></i><span class="ml-4 menu-text">Profil</span>
            </a>
            <button type="button" onclick="openLogoutModal()" class="w-full flex items-center p-3 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-600 transition mt-4 border-t border-gray-100 pt-4">
                <i class="bi bi-box-arrow-right text-lg"></i><span class="ml-4 menu-text">Keluar</span>
            </button>
        </nav>
    </aside>

    <main class="main-content min-h-screen p-4 md:p-8">
        <header class="flex flex-col gap-4 md:flex-row md:justify-between md:items-end mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-gray-900">Daftar Surat</h2>
                <p class="mt-1 text-sm text-slate-500">Kelola surat masuk dan keluar dengan tampilan ringkas, bersih, dan proporsional.</p>
            </div>
            <a href="{{ route('surat.create') }}" class="bg-[#4B164C] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#3F125A] transition shadow-sm">
                <i class="bi bi-plus-lg mr-2"></i>Tambah
            </a>
        </header>

        <div class="transactions-card">
            <div class="table-toolbar">
                <div class="toolbar-select">
                    <span>Show</span>
                    <select aria-label="Show entries" id="entriesSelect">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span>entries</span>
                </div>
                <div class="toolbar-search">
                    <div class="relative">
                        <i class="bi bi-search search-icon"></i>
                        <input id="tableSearch" type="search" class="search-input" placeholder="Cari surat, nomor, pengirim..." />
                    </div>
                </div>
            </div>

            <table id="tabelSurat" class="table transactions-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nomor Surat</th>
                        <th>Tgl Buat</th>
                        <th>Tgl Masuk</th>
                        <th>Pengirim</th>
                        <th>Nama Surat</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($surats as $surat)
                    <tr>
                        <td class="font-medium">{{ $loop->iteration }}</td>
                        <td class="font-semibold text-[#4B164C]">{{ $surat->nomor_surat }}</td>
                        <td class="text-gray-500">{{ $surat->created_at->format('d/m/Y') }}</td>
                        <td class="text-gray-500">{{ $surat->tanggal_masuk ? \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') : '-' }}</td>
                        <td class="text-gray-700">{{ $surat->nama_pengirim }}</td>
                        <td class="text-gray-700">{{ $surat->nama_surat }}</td>
                        <td>
                            <div class="action-wrapper">
                                <a href="#" class="action-btn view-btn"
                                   data-file-url="{{ route('surat.preview', $surat->id) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-surat-number="{{ $surat->nomor_surat }}"
                                   data-tanggal-buat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}"
                                   data-tanggal-masuk="{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') }}"
                                   data-pengirim="{{ $surat->nama_pengirim }}"
                                   data-nama-surat="{{ $surat->nama_surat }}"
                                   title="Lihat"><i class="bi bi-eye"></i></a>
                                <a href="#" class="action-btn print-btn"
                                   data-file-url="{{ route('surat.preview', $surat->id) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-surat-number="{{ $surat->nomor_surat }}"
                                   data-tanggal-buat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}"
                                   data-tanggal-masuk="{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') }}"
                                   data-pengirim="{{ $surat->nama_pengirim }}"
                                   data-nama-surat="{{ $surat->nama_surat }}"
                                   title="Cetak"><i class="bi bi-printer"></i></a>
                                <a href="{{ route('surat.edit', $surat->id) }}" class="action-btn" title="Edit"><i class="bi bi-pencil-square"></i></a>
                                <form action="{{ route('surat.destroy', $surat->id) }}" method="POST" class="inline-flex"
                                      onsubmit="return confirm('Yakin ingin menghapus surat &quot;{{ $surat->nama_surat }}&quot; ini?');">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="action-btn" title="Hapus"><i class="bi bi-trash"></i></button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </main>

    <div id="previewModal" class="fixed inset-0 z-[200] hidden items-center justify-center bg-black/50 p-4">
        <div class="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] flex-shrink-0">
                <h3 class="text-white font-semibold text-lg">Detail Surat</h3>
                <div class="flex items-center gap-1">
                    <button type="button" id="modalPrintBtn" class="text-white hover:bg-white/20 p-2 rounded-lg transition" title="Cetak">
                        <i class="bi bi-printer text-xl"></i>
                    </button>
                    <button type="button" id="modalCloseBtn" class="text-white hover:bg-white/20 p-2 rounded-lg transition" title="Tutup">
                        <i class="bi bi-x-lg text-xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 overflow-y-auto">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-purple-50 rounded-xl p-5">
                    <div><p class="text-xs text-gray-500 mb-1">Nomor Surat</p><p id="pvNomor" class="font-semibold text-[#4B164C]">-</p></div>
                    <div><p class="text-xs text-gray-500 mb-1">Nama Surat</p><p id="pvNamaSurat" class="font-semibold text-gray-800">-</p></div>
                    <div><p class="text-xs text-gray-500 mb-1">Pengirim</p><p id="pvPengirim" class="font-medium text-gray-700">-</p></div>
                    <div><p class="text-xs text-gray-500 mb-1">Nama File</p><p id="pvFileName" class="font-medium text-gray-700 break-all">-</p></div>
                    <div><p class="text-xs text-gray-500 mb-1">Tanggal Buat</p><p id="pvTglBuat" class="font-medium text-gray-700">-</p></div>
                    <div><p class="text-xs text-gray-500 mb-1">Tanggal Masuk</p><p id="pvTglMasuk" class="font-medium text-gray-700">-</p></div>
                </div>
                <div id="pvFileContainer" class="border border-gray-200 rounded-xl overflow-hidden bg-gray-50"></div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

        let currentPreview = {};

        function getExt(filename) {
            if (!filename) return '';
            return filename.split('.').pop().toLowerCase();
        }

        // Bangun tampilan pratinjau sesuai tipe file agar formatnya tetap terbawa utuh
        function buildPreviewMarkup(fileUrl, fileName) {
            const ext = getExt(fileName);
            const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

            if (ext === 'pdf') {
                return `<iframe src="${fileUrl}" class="w-full" style="height:65vh;border:0;"></iframe>`;
            }
            if (imageExt.includes(ext)) {
                return `<div class="flex justify-center p-4">
                            <img src="${fileUrl}" class="max-w-full max-h-[65vh] rounded-lg shadow-sm" alt="${fileName}">
                        </div>`;
            }
            return `<div class="flex flex-col items-center justify-center text-center py-16 px-6">
                        <i class="bi bi-file-earmark-richtext text-6xl text-[#DD88CF] mb-4"></i>
                        <p class="text-gray-700 font-medium mb-1">${fileName}</p>
                        <p class="text-gray-400 text-sm mb-5">Pratinjau langsung tidak didukung untuk format .${ext}.<br>Buka file aslinya agar semua format terbawa utuh.</p>
                        <a href="${fileUrl}" target="_blank" class="bg-[#4B164C] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#DD88CF] transition">
                            <i class="bi bi-box-arrow-up-right mr-2"></i>Buka File
                        </a>
                    </div>`;
        }

        function openPreview(fileUrl, fileName, nomor, tglBuat, tglMasuk, pengirim, namaSurat) {
            currentPreview = { fileUrl, fileName, nomor, tglBuat, tglMasuk, pengirim, namaSurat };

            $('#pvNomor').text(nomor || '-');
            $('#pvNamaSurat').text(namaSurat || '-');
            $('#pvPengirim').text(pengirim || '-');
            $('#pvFileName').text(fileName || '-');
            $('#pvTglBuat').text(tglBuat || '-');
            $('#pvTglMasuk').text(tglMasuk || '-');
            $('#pvFileContainer').html(buildPreviewMarkup(fileUrl, fileName));

            $('#previewModal').removeClass('hidden').addClass('flex');
            document.body.classList.add('overflow-hidden');
        }

        function closePreview() {
            $('#previewModal').addClass('hidden').removeClass('flex');
            $('#pvFileContainer').empty();
            document.body.classList.remove('overflow-hidden');
        }

        // Cetak surat: sertakan data surat + file aslinya supaya semua formatnya terbawa saat print
        function printSurat(fileUrl, fileName, nomor, tglBuat, tglMasuk, pengirim, namaSurat) {
            const ext = getExt(fileName);
            const printableExt = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

            const printWindow = window.open('', '_blank');
            const header = `
                <div style="font-family:'Poppins',Arial,sans-serif;padding:24px 24px 0;">
                    <h2 style="margin:0 0 16px;color:#4B164C;">Detail Surat</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;">
                        <tr><td style="padding:6px 12px 6px 0;color:#666;width:160px;">Nomor Surat</td><td style="padding:6px 0;font-weight:600;">${nomor || '-'}</td></tr>
                        <tr><td style="padding:6px 12px 6px 0;color:#666;">Nama Surat</td><td style="padding:6px 0;font-weight:600;">${namaSurat || '-'}</td></tr>
                        <tr><td style="padding:6px 12px 6px 0;color:#666;">Pengirim</td><td style="padding:6px 0;">${pengirim || '-'}</td></tr>
                        <tr><td style="padding:6px 12px 6px 0;color:#666;">Tanggal Buat</td><td style="padding:6px 0;">${tglBuat || '-'}</td></tr>
                        <tr><td style="padding:6px 12px 6px 0;color:#666;">Tanggal Masuk</td><td style="padding:6px 0;">${tglMasuk || '-'}</td></tr>
                        <tr><td style="padding:6px 12px 6px 0;color:#666;">Nama File</td><td style="padding:6px 0;">${fileName || '-'}</td></tr>
                    </table>
                </div>`;

            if (printableExt.includes(ext)) {
                const body = ext === 'pdf'
                    ? `<iframe src="${fileUrl}" style="width:100%;height:80vh;border:0;"></iframe>`
                    : `<img src="${fileUrl}" style="max-width:100%;">`;

                printWindow.document.write(`
                    <html><head><title>Cetak Surat - ${nomor || ''}</title></head>
                    <body style="margin:0;">
                        ${header}
                        <div style="padding:0 24px 24px;">${body}</div>
                        <script>
                            window.onload = function () {
                                setTimeout(function () { window.focus(); window.print(); }, 400);
                            };
                        <\/script>
                    </body></html>
                `);
            } else {
                printWindow.document.write(`
                    <html><head><title>Cetak Surat - ${nomor || ''}</title></head>
                    <body style="margin:0;">
                        ${header}
                        <div style="padding:0 24px 24px;font-family:'Poppins',Arial,sans-serif;">
                            <p style="color:#666;">File ini berformat .${ext} sehingga tidak bisa dicetak langsung dari pratinjau browser.
                            Buka file berikut lalu cetak dari aplikasi aslinya (mis. Word/Excel) agar semua format (font, tabel, layout) tetap utuh:</p>
                            <a href="${fileUrl}" target="_blank" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#4B164C;color:#fff;border-radius:8px;text-decoration:none;">Buka File</a>
                        </div>
                    </body></html>
                `);
            }
            printWindow.document.close();
        }

        $(document).ready(function() {
            // Inisialisasi DataTable: hapus huruf 'f' (filter) dari setelan dom default agar tidak dobel
            const suratTable = $('#tabelSurat').DataTable({
                "responsive": true,
                "dom": 't<"flex flex-col sm:flex-row justify-between items-center mt-4"ip>',
                "language": {
                    "search": "",
                    "lengthMenu": "_MENU_",
                    "info": "Data _START_ - _END_ dari _TOTAL_",
                    "paginate": {
                        "previous": "<i class='bi bi-chevron-left'></i>",
                        "next": "<i class='bi bi-chevron-right'></i>"
                    }
                }
            });

            // Menghubungkan kolom input pencarian kustom ke sistem DataTables
            $('#tableSearch').on('input', function () {
                suratTable.search(this.value).draw();
            });

            // Menghubungkan dropdown Show Entries kustom ke sistem DataTables
            $('#entriesSelect').on('change', function () {
                suratTable.page.len(this.value).draw();
            });

            $(document).on('click', '.view-btn', function (e) {
                e.preventDefault();
                const d = $(this).data();
                openPreview(d.fileUrl, d.fileName, d.suratNumber, d.tanggalBuat, d.tanggalMasuk, d.pengirim, d.namaSurat);
            });

            $(document).on('click', '.print-btn', function (e) {
                e.preventDefault();
                const d = $(this).data();
                printSurat(d.fileUrl, d.fileName, d.suratNumber, d.tanggalBuat, d.tanggalMasuk, d.pengirim, d.namaSurat);
            });

            $('#modalCloseBtn').on('click', closePreview);
            $('#previewModal').on('click', function (e) {
                if (e.target === this) closePreview();
            });
            $('#modalPrintBtn').on('click', function () {
                if (!currentPreview.fileUrl) return;
                printSurat(
                    currentPreview.fileUrl, currentPreview.fileName, currentPreview.nomor,
                    currentPreview.tglBuat, currentPreview.tglMasuk, currentPreview.pengirim, currentPreview.namaSurat
                );
            });
            $(document).on('keydown', function (e) {
                if (e.key === 'Escape') closePreview();
            });
        });
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>