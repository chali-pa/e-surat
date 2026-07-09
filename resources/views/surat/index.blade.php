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
        .action-btn:hover { transform: scale(1.05); background: #e2e8f0; color: #1f2937; }
        .delete-btn { color: #ef4444; border-color: #fee2e2; }

        .dataTables_wrapper .dataTables_length { display: none !important; }
        .dataTables_wrapper .dataTables_filter {
            float: right;
            text-align: right;
        }
        .dataTables_wrapper .dataTables_filter label {
            font-size: 0;
            color: transparent;
            display: block;
            width: 0;
            height: 0;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        .dataTables_wrapper .dataTables_filter input {
            margin-left: 0;
            border: 1px solid #e2e8f0;
            border-radius: 9999px;
            padding: 0.85rem 1rem;
            background: #f8fafc;
            color: #475569;
            min-width: 220px;
        }
        .dataTables_wrapper .dataTables_filter input:focus {
            outline: none;
            box-shadow: 0 0 0 4px rgba(148,163,184,0.16);
            border-color: #cbd5e1;
        }

        .preview-overlay {
            position: fixed; inset: 0; z-index: 200; display: none; align-items: center; justify-content: center;
            padding: 20px; background: rgba(17, 24, 39, 0.72);
        }
        .preview-overlay.show { display: flex; }
        .preview-shell {
            width: min(1100px, 100%);
            max-height: 85vh;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.22);
            display: flex;
            flex-direction: column;
        }
        .preview-header {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
            background: white;
        }
        .preview-body {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            padding: 0 0 20px;
        }
        .preview-frame { flex: 1; background: #f3f4f6; }
        .preview-frame iframe { width: 100%; height: 100%; border: 0; background: white; }

        @media (max-width: 640px) { .dataTables_wrapper .dataTables_length, .dataTables_wrapper .dataTables_filter { text-align: center; margin-bottom: 10px; } }
    </style>
</head>
<body>

    <!-- sidebar -->
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
        </nav>
    </aside>

    <main class="main-content min-h-screen p-4 md:p-8">
        <header class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-800">Daftar Surat</h2>
            <a href="{{ route('surat.create') }}" class="bg-[#4B164C] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#DD88CF] transition shadow-lg">
                <i class="bi bi-plus-lg mr-2"></i>Tambah
            </a>
        </header>

        <div class="transactions-card">
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
                                <button type="button" class="action-btn view-btn" data-file-url="{{ route('surat.preview', $surat->id) }}" data-file-name="{{ $surat->nama_file }}" data-surat-number="{{ $surat->nomor_surat }}" data-tanggal-buat="{{ $surat->created_at->format('d/m/Y') }}" data-tanggal-masuk="{{ $surat->tanggal_masuk ? \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') : '-' }}" data-pengirim="{{ $surat->nama_pengirim }}" data-nama-surat="{{ $surat->nama_surat }}" title="Lihat"><i class="bi bi-eye"></i></button>
                                <button type="button" class="action-btn print-btn" data-file-url="{{ route('surat.preview', $surat->id) }}" data-file-name="{{ $surat->nama_file }}" title="Cetak"><i class="bi bi-printer"></i></button>
                                <a href="{{ route('surat.edit', $surat->id) }}" class="action-btn" title="Edit"><i class="bi bi-pencil-square"></i></a>
                                <button type="button" class="action-btn delete-btn" title="Hapus"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </main>

    <div id="previewOverlay" class="preview-overlay" role="dialog" aria-modal="true">
        <div class="preview-shell">
            <div class="preview-header">
                <div>
                    <h3 id="previewTitle" class="text-lg font-semibold text-gray-800">Detail Surat</h3>
                    <p id="previewSubtitle" class="text-sm text-gray-500">Semua informasi hanya untuk dibaca, tidak dapat diedit.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="closePreviewBtn" type="button" class="px-3 py-2 rounded-lg bg-[#4B164C] text-white hover:bg-[#DD88CF] transition">Tutup</button>
                </div>
            </div>
            <div class="preview-body px-6 py-4 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Nomor Surat</p>
                        <p id="detailNomorSurat" class="mt-2 text-sm font-semibold text-slate-800"></p>
                    </div>
                    <div class="rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Nama Surat</p>
                        <p id="detailNamaSurat" class="mt-2 text-sm font-semibold text-slate-800"></p>
                    </div>
                    <div class="rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Tanggal Buat</p>
                        <p id="detailTanggalBuat" class="mt-2 text-sm font-semibold text-slate-800"></p>
                    </div>
                    <div class="rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Tanggal Masuk</p>
                        <p id="detailTanggalMasuk" class="mt-2 text-sm font-semibold text-slate-800"></p>
                    </div>
                    <div class="sm:col-span-2 rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Pengirim</p>
                        <p id="detailPengirim" class="mt-2 text-sm font-semibold text-slate-800"></p>
                    </div>
                </div>
                <div class="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white">
                    <div class="bg-[#eef2ff] px-4 py-3 text-sm font-semibold text-slate-700">Isi Surat</div>
                    <div id="detailContentSection" class="p-4 min-h-[260px] bg-white text-slate-600">
                        <iframe id="previewFrame" title="Preview surat" class="w-full h-[320px] border-0"></iframe>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let sidebarWasCollapsedBeforePreview = false;

        document.getElementById('toggleBtn').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

        function setSidebarCollapsed(collapsed) {
            document.body.classList.toggle('sidebar-collapsed', collapsed);
        }

        function openPreview(fileUrl, fileName, suratNumber, tanggalBuat, tanggalMasuk, pengirim, suratName) {
            const previewFrame = document.getElementById('previewFrame');
            const previewTitle = document.getElementById('previewTitle');
            const previewSubtitle = document.getElementById('previewSubtitle');
            const detailNomorSurat = document.getElementById('detailNomorSurat');
            const detailNamaSurat = document.getElementById('detailNamaSurat');
            const detailTanggalBuat = document.getElementById('detailTanggalBuat');
            const detailTanggalMasuk = document.getElementById('detailTanggalMasuk');
            const detailPengirim = document.getElementById('detailPengirim');

            previewTitle.textContent = 'Detail Surat';
            previewSubtitle.textContent = 'Semua informasi hanya untuk dibaca, tidak dapat diedit.';
            detailNomorSurat.textContent = suratNumber || '-';
            detailNamaSurat.textContent = suratName || '-';
            detailTanggalBuat.textContent = tanggalBuat || '-';
            detailTanggalMasuk.textContent = tanggalMasuk || '-';
            detailPengirim.textContent = pengirim || '-';
            previewFrame.src = fileUrl;

            document.getElementById('previewOverlay').classList.add('show');
            sidebarWasCollapsedBeforePreview = document.body.classList.contains('sidebar-collapsed');
            setSidebarCollapsed(true);
        }

        function closePreview() {
            document.getElementById('previewOverlay').classList.remove('show');
            document.getElementById('previewFrame').src = 'about:blank';
            setSidebarCollapsed(sidebarWasCollapsedBeforePreview);
        }

        document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
        document.getElementById('previewOverlay').addEventListener('click', function (event) {
            if (event.target.id === 'previewOverlay') {
                closePreview();
            }
        });

        function printSurat(fileUrl, fileName) {
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = 'none';
            printFrame.src = fileUrl;
            document.body.appendChild(printFrame);

            printFrame.onload = function () {
                try {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                } catch (err) {
                    window.open(fileUrl, '_blank');
                }

                setTimeout(function () {
                    document.body.removeChild(printFrame);
                }, 1000);
            };
        }

        $(document).ready(function() {
            $('#tabelSurat').DataTable({
                "responsive": true,
                "dom": '<"flex flex-col sm:flex-row justify-between items-center mb-4"f>t<"flex flex-col sm:flex-row justify-between items-center mt-4"ip>',
                "language": {
                    "search": "",
                    "lengthMenu": "_MENU_",
                    "info": "Data _START_ - _END_ dari _TOTAL_",
                    "paginate": {
                        "previous": "<i class='bi bi-chevron-left'></i>",
                        "next": "<i class='bi bi-chevron-right'></i>"
                    }
                },
                "initComplete": function () {
                    const api = this.api();
                    const filter = $(api.table().container()).find('.dataTables_filter input');
                    filter.attr('placeholder', 'Cari surat, nomor, pengirim...');
                }
            });

            $(document).on('click', '.view-btn', function () {
                openPreview(
                    $(this).data('file-url'),
                    $(this).data('file-name'),
                    $(this).data('surat-number'),
                    $(this).data('tanggal-buat'),
                    $(this).data('tanggal-masuk'),
                    $(this).data('pengirim'),
                    $(this).data('nama-surat')
                );
            });

            $(document).on('click', '.print-btn', function () {
                const fileUrl = $(this).data('file-url');
                const fileName = $(this).data('file-name');
                printSurat(fileUrl, fileName);
            });
        });
    </script>
</body>
</html>
