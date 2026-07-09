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

        /* Unified Radial Gradient Header */
        .transactions-table thead tr { background: radial-gradient(circle at 100% 0%, #DD88CF, #4B164C) !important; }
        .transactions-table thead th { color: white !important; padding: 16px !important; font-weight: 600 !important; border: none !important; white-space: nowrap; }

        .transactions-card { background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .transactions-table { border-collapse: separate !important; border-spacing: 0 !important; width: 100% !important; overflow: hidden; border-radius: 12px; }
        .transactions-table tbody td { padding: 14px !important; border-bottom: 1px solid #f3f4f6; }

        /* Responsive Action Container */
        .action-wrapper { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; align-items: center; min-width: 120px; }
        .action-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 8px;
            border: 1px solid #DD88CF; color: #4B164C;
            transition: all 0.2s ease; flex-shrink: 0;
        }
        .action-btn:hover { background: #4B164C; color: white; border-color: #4B164C; transform: scale(1.05); }

        /* Pagination & Search Responsive */
        .dataTables_wrapper .dataTables_filter input { border: 1px solid #DD88CF; border-radius: 8px; padding: 4px 10px; }

        .preview-overlay {
            position: fixed; inset: 0; z-index: 200; display: none; align-items: center; justify-content: center;
            padding: 20px; background: rgba(17, 24, 39, 0.72);
        }
        .preview-overlay.show { display: flex; }
        .preview-shell {
            width: min(1100px, 100%); height: min(85vh, 900px); background: white; border-radius: 20px;
            overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.22); display: flex; flex-direction: column;
        }
        .preview-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
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
                                <button type="button" class="action-btn view-btn" data-file-url="{{ route('surat.preview', $surat->id) }}" data-file-name="{{ $surat->nama_file }}" title="Lihat"><i class="bi bi-eye"></i></button>
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
                    <h3 id="previewTitle" class="text-lg font-semibold text-gray-800">Preview Surat</h3>
                    <p id="previewSubtitle" class="text-sm text-gray-500">Dokumen akan ditampilkan di sini.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="printPreviewBtn" type="button" class="px-3 py-2 rounded-lg border border-[#DD88CF] text-[#4B164C] hover:bg-[#4B164C] hover:text-white transition">Cetak</button>
                    <button id="closePreviewBtn" type="button" class="px-3 py-2 rounded-lg bg-[#4B164C] text-white hover:bg-[#DD88CF] transition">Tutup</button>
                </div>
            </div>
            <div class="preview-frame">
                <iframe id="previewFrame" title="Preview surat"></iframe>
            </div>
        </div>
    </div>

    <script>
        let sidebarWasCollapsedBeforePreview = false;

        document.getElementById('toggleBtn').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

        function setSidebarCollapsed(collapsed) {
            document.body.classList.toggle('sidebar-collapsed', collapsed);
        }

        function openPreview(fileUrl, fileName) {
            const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
            const supportedPreview = ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'html', 'md'];
            const previewFrame = document.getElementById('previewFrame');
            const previewTitle = document.getElementById('previewTitle');
            const previewSubtitle = document.getElementById('previewSubtitle');

            previewTitle.textContent = fileName || 'Preview Surat';
            previewSubtitle.textContent = supportedPreview.includes(ext)
                ? 'Dokumen sedang ditampilkan untuk dilihat langsung.'
                : 'File ini akan dibuka di tab baru untuk dilihat.';

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

        document.getElementById('printPreviewBtn').addEventListener('click', function () {
            const previewUrl = document.getElementById('previewFrame').src;
            if (previewUrl && previewUrl !== 'about:blank') {
                window.open(previewUrl, '_blank');
            }
        });

        $(document).ready(function() {
            $('#tabelSurat').DataTable({
                "responsive": true,
                "dom": '<"flex flex-col sm:flex-row justify-between items-center mb-4"lf>t<"flex flex-col sm:flex-row justify-between items-center mt-4"ip>',
                "language": {
                    "search": "Cari:",
                    "lengthMenu": "_MENU_",
                    "info": "Data _START_ - _END_ dari _TOTAL_",
                    "paginate": {
                        "previous": "<i class='bi bi-chevron-left'></i>",
                        "next": "<i class='bi bi-chevron-right'></i>"
                    }
                }
            });

            $(document).on('click', '.view-btn', function () {
                openPreview($(this).data('file-url'), $(this).data('file-name'));
            });

            $(document).on('click', '.print-btn', function () {
                const fileUrl = $(this).data('file-url');
                const fileName = $(this).data('file-name');
                openPreview(fileUrl, fileName);
            });
        });
    </script>
</body>
</html>
