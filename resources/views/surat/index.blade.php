<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manajemen Surat – E-Surat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <!-- JSZip diperlukan oleh docx-preview -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <!-- docx-preview: render DOCX ke HTML tanpa konversi -->
    <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.7/dist/docx-preview.min.js"></script>
    <!-- SheetJS: render Excel/CSV ke HTML -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- Mammoth fallback: konversi DOC/DOCX ke HTML (opsional) -->

    <style>
        /* ===== Base ===== */
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }

        /* ===== Sidebar ===== */
        #sidebar {
            transition: width 0.3s;
            width: 260px;
            position: fixed;
            height: 100vh;
            z-index: 100;
            background: #ffffff;
            border-right: 1px solid #e5e7eb;
            overflow: hidden;
        }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

        /* ===== Toolbar ===== */
        .table-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: .75rem;
            margin-bottom: 1rem;
            padding-bottom: .75rem;
            border-bottom: 1px solid #E5E7EB;
        }
        .toolbar-select { display: inline-flex; align-items: center; gap: .5rem; color: #374151; font-size: .95rem; }
        .toolbar-select select {
            min-width: 4.5rem;
            padding: .55rem .75rem;
            border: 1px solid #D1D5DB;
            border-radius: .75rem;
            background: #fff;
            color: #111827;
            font-size: .95rem;
            outline: none;
        }
        .toolbar-search { max-width: 280px; width: 100%; }
        .search-input {
            width: 100%;
            min-height: 44px;
            padding: .9rem 1rem .9rem 3rem;
            border: 1px solid #D1D5DB;
            border-radius: .75rem;
            background: #fff;
            color: #111827;
            font-size: .95rem;
        }
        .search-input:focus { outline: none; border-color: #A5B4FC; box-shadow: 0 0 0 4px rgba(165,180,252,.14); }
        .search-icon { position: absolute; left: .95rem; top: 50%; transform: translateY(-50%); font-size: 1rem; color: #6B7280; }

        /* ===== Table Card ===== */
        .transactions-card { background: #fff; border-radius: 24px; padding: 20px 24px; border: 1px solid #e5e7eb; box-shadow: 0 12px 40px rgba(15,23,42,.06); }
        .table-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 18px; }
        .transactions-table { width: 100% !important; min-width: 720px; border-collapse: separate !important; border-spacing: 0 !important; border-radius: 18px; overflow: hidden; }
        .transactions-table thead tr { background: #eef2ff !important; }
        .transactions-table thead th { color: #475569 !important; font-weight: 600 !important; padding: 16px 18px !important; border: none !important; font-size: .85rem !important; }
        .transactions-table thead th:first-child { text-align: center !important; }
        .transactions-table tbody tr { border-bottom: 1px solid rgba(148,163,184,.16); }
        .transactions-table tbody tr:hover { background: #f8fafc; }
        .transactions-table tbody tr:last-child td { border-bottom: none !important; }
        .transactions-table tbody td { padding: 16px 18px !important; color: #475569 !important; font-size: .93rem !important; vertical-align: middle !important; }
        .transactions-table tbody td:first-child { text-align: center !important; }
        .transactions-table tbody td:last-child { text-align: right !important; }
        .dataTables_wrapper .dataTables_filter,
        .dataTables_wrapper .dataTables_length { display: none !important; }

        /* ===== Action buttons ===== */
        .action-wrapper { display: inline-flex; gap: 6px; align-items: center; justify-content: flex-end; }
        .action-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 50%;
            color: #475569; background: #f8fafc; border: 1px solid #e2e8f0;
            transition: background .15s, transform .15s, color .15s;
            cursor: pointer; text-decoration: none;
        }
        .action-btn:hover { background: #4B164C; color: #fff; border-color: #4B164C; transform: scale(1.06); }
        .action-btn i { pointer-events: none; }

        /* ===== Preview Modal ===== */
        #previewModal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0,0,0,.6);
            align-items: center;
            justify-content: center;
            padding: .35rem;
        }
        #previewModal.open { display: flex; }

        .pv-dialog {
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 32px 100px rgba(0,0,0,.28);
            width: 100%;
            max-width: min(2200px, 99vw);
            max-height: 99vh;
            height: 98vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header */
        .pv-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 20px;
            background: linear-gradient(135deg, #4B164C 0%, #7B2D7C 55%, #DD88CF 100%);
            flex-shrink: 0;
        }
        .pv-title { color: #fff; font-weight: 600; font-size: .97rem; }
        .pv-header-btns { display: flex; gap: 6px; }
        .pv-hbtn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 6px 13px; border-radius: 9px; font-size: .82rem; font-weight: 500;
            border: none; cursor: pointer; transition: background .15s; color: #fff;
        }
        .pv-hbtn-print { background: rgba(255,255,255,.22); }
        .pv-hbtn-print:hover { background: rgba(255,255,255,.38); }
        .pv-hbtn-dl { background: rgba(255,255,255,.14); }
        .pv-hbtn-dl:hover { background: rgba(255,255,255,.28); }
        .pv-hbtn-close { background: transparent; opacity: .8; }
        .pv-hbtn-close:hover { background: rgba(255,255,255,.22); opacity: 1; }

        /* Meta */
        .pv-meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 16px;
            padding: 14px 20px;
            background: #faf5ff;
            border-bottom: 1px solid #e9d5ff;
            flex-shrink: 0;
        }
        @media (min-width: 640px) { .pv-meta { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 860px) { .pv-meta { grid-template-columns: repeat(6, 1fr); } }
        .pv-meta-item .lbl { font-size: .68rem; color: #9ca3af; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
        .pv-meta-item .val { font-size: .85rem; color: #1f2937; font-weight: 600; word-break: break-word; }
        .pv-meta-item .val.nomor { color: #4B164C; }

        /* Sheet tabs (XLSX) */
        .pv-sheet-tabs { display: none; padding: 8px 16px 0; background: #f9fafb; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; gap: 4px; flex-wrap: wrap; }
        .pv-sheet-tabs.show { display: flex; }
        .sheet-tab {
            padding: 4px 13px; border-radius: 6px 6px 0 0; font-size: .78rem; cursor: pointer;
            background: #e5e7eb; color: #374151; border: 1px solid #d1d5db; border-bottom: none; transition: background .12s;
        }
        .sheet-tab.active { background: #4B164C; color: #fff; border-color: #4B164C; }

        /* ===== Panel Management - Pastikan hanya satu panel yang tampil ===== */
        .pv-panel { 
            display: none !important; 
            flex: 1; 
            min-height: 0; 
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        .pv-panel.show { 
            display: flex !important; 
            flex-direction: column;
            position: relative;
        }
        
        /* Body container harus relative untuk panel absolute */
        .pv-body {
            flex: 1;
            min-height: 0;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Loading */
        .pv-loading {
            position: absolute; 
            inset: 0;
            display: none; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            background: #fff; 
            z-index: 10; 
            gap: 14px; 
            color: #6b7280;
        }
        .pv-loading.show {
            display: flex !important;
        }
        .pv-loading .spin {
            width: 44px; height: 44px;
            border: 4px solid #e9d5ff; border-top-color: #4B164C;
            border-radius: 50%; animation: pv-spin .75s linear infinite;
        }
        .pv-loading p { font-size: .88rem; }
        @keyframes pv-spin { to { transform: rotate(360deg); } }

        /* Panels */
        .pv-panel { 
            display: none !important; 
            flex: 1; 
            min-height: 0; 
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        .pv-panel.show { 
            display: flex !important; 
            flex-direction: column !important;
            position: relative !important;
        }

        /* PDF / iframe */
        #pvIframe { 
            border: none; 
            width: 100%; 
            flex: 1; 
            min-height: 0; 
            background: #fff;
        }

        /* Image */
        #pvImgWrap {
            flex: 1; min-height: 0; overflow: auto;
            background: #f8f9fa;
            display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        #pvImg { 
            max-width: 100%; 
            max-height: 100%; 
            border-radius: 8px; 
            box-shadow: 0 4px 24px rgba(0,0,0,.2); 
        }

        /* DOCX — dirender langsung sebagai HTML pakai docx-preview (bukan iframe) */
        #pvDocxWrap {
            flex: 1;
            min-height: 0;
            padding: 24px;
            position: relative;
            background: #eef0f3;
            overflow: auto;
        }

        /* Container hasil render docx-preview */
        #pvDocxContent {
            max-width: 1150px;
            margin: 0 auto;
        }
        #pvDocxContent .docx-wrapper {
            background: transparent;
            padding: 0 !important;
        }
        #pvDocxContent .docx-wrapper > section.docx {
            margin: 0 auto 20px !important;
            box-shadow: 0 4px 24px rgba(0,0,0,.12) !important;
        }

        /* XLSX */
        #pvXlsxWrap { 
            flex: 1; 
            min-height: 0; 
            overflow: auto; 
            background: #f8f9fa; 
            padding: 0; 
        }
        #pvXlsxWrap table { 
            border-collapse: collapse; 
            font-size: .9rem; 
            min-width: 100%; 
            background: #fff;
        }
        #pvXlsxWrap th, #pvXlsxWrap td { 
            border: 1px solid #d1d5db; 
            padding: 7px 12px; 
            white-space: nowrap; 
        }
        #pvXlsxWrap th { 
            background: #f3f4f6; 
            font-weight: 600; 
            position: sticky; 
            top: 0; 
            z-index: 1; 
        }
        #pvXlsxWrap tr:nth-child(even) { 
            background: #fafafa; 
        }
        .xlsx-sheet-container { 
            padding: 16px; 
        }

        /* Unsupported */
        #pvUnsupported {
            flex: 1; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center; padding: 32px; color: #6b7280;
        }

        /* ===== PRINT AREA (in-page, hidden on screen) ===== */
        #printArea { display: none; }

        /* ===== @media print ===== */
        @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            /* Sembunyikan semua KECUALI printArea saat modus cetak */
            body.is-printing > *:not(#printArea) { display: none !important; }
            body.is-printing #printArea {
                display: block !important;
                position: static !important;
                width: 100%;
                margin: 0;
                padding: 0;
            }

            /* Gaya cetak DOCX */
            #printArea .docx-wrapper {
                background: #fff !important;
                padding: 0 !important;
            }
            #printArea .docx-wrapper > section.docx {
                box-shadow: none !important;
                margin: 0 auto !important;
            }
            #printArea img { max-width: 100% !important; }

            /* Gaya cetak XLSX */
            #printArea .print-xlsx-wrap table { border-collapse: collapse; width: 100%; font-size: 10pt; }
            #printArea .print-xlsx-wrap th,
            #printArea .print-xlsx-wrap td { border: 1px solid #888; padding: 4px 8px; }
            #printArea .print-xlsx-wrap th { background: #e0e0e0 !important; font-weight: 700; }
            #printArea .print-xlsx-wrap h3 { font-size: 11pt; margin: 14px 0 4px; }

            /* Gaya cetak gambar */
            #printArea .print-img-wrap {
                display: flex; align-items: center; justify-content: center;
                min-height: 100vh;
            }
            #printArea .print-img-wrap img { max-width: 100%; height: auto; }
        }

        /* ===== Responsive ===== */
        @media (max-width: 640px) {
            .table-toolbar { flex-direction: column; align-items: stretch; }
            .toolbar-search { max-width: 100%; }
            .transactions-card { padding: 14px; border-radius: 18px; }
            .pv-dialog { 
                max-height: 100vh; 
                border-radius: 14px; 
                max-width: 100vw; 
                width: 100vw;
                height: 100vh;
            }
        }
        @media (max-width: 1024px) {
            .pv-dialog { max-width: 100vw; }
        }

        /* ===== Responsive: Mobile Sidebar ===== */
        #sidebarOverlay { display: none; }
        @media (max-width: 767px) {
            #sidebar, body.sidebar-collapsed #sidebar {
                width: 260px !important;
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            body.sidebar-mobile-open #sidebar { transform: translateX(0); }
            body.sidebar-collapsed .menu-text { opacity: 1 !important; display: inline !important; }
            .main-content { margin-left: 0 !important; }
            body.sidebar-mobile-open #sidebarOverlay {
                display: block;
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.5);
                z-index: 90;
            }
        }
        
        /* Pastikan semua panel preview menggunakan ukuran yang sama dan tidak overlap */
        #pvPanelIframe, #pvPanelImage, #pvPanelDocx, #pvPanelXlsx, #pvPanelUnsupported {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            display: none !important;
            flex-direction: column !important;
        }
        
        #pvPanelIframe.show, #pvPanelImage.show, #pvPanelDocx.show, 
        #pvPanelXlsx.show, #pvPanelUnsupported.show {
            display: flex !important;
            position: relative !important;
        }
    </style>
</head>
<body>

    <!-- Mobile Topbar -->
    <header class="md:hidden sticky top-0 z-[80] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <button type="button" onclick="openMobileSidebar()" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
        <span class="font-bold text-[#4B164C] text-lg">E-Surat</span>
        <span class="w-9"></span>
    </header>
    <div id="sidebarOverlay" onclick="closeMobileSidebar()"></div>

    <!-- ========= SIDEBAR ========= -->
    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4">
            <button id="toggleBtn" class="p-2 rounded-xl hover:bg-gray-100">
                <i class="bi bi-list text-2xl"></i>
            </button>
            <span class="ml-3 font-bold text-[#4B164C] text-lg menu-text">E-Surat</span>
        </div>
        <nav class="flex-1 p-3 space-y-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-grid-1x2-fill text-lg"></i>
                <span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C]">
                <i class="bi bi-envelope-fill text-lg"></i>
                <span class="ml-4 menu-text">Kelola Surat</span>
            </a>
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-person-fill text-lg"></i>
                <span class="ml-4 menu-text">Profil</span>
            </a>
            <button type="button" onclick="openLogoutModal()"
                    class="w-full flex items-center p-3 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-600 transition mt-4 border-t border-gray-100 pt-4">
                <i class="bi bi-box-arrow-right text-lg"></i>
                <span class="ml-4 menu-text">Keluar</span>
            </button>
        </nav>
    </aside>

    <!-- ========= MAIN ========= -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <header class="flex flex-col gap-4 md:flex-row md:justify-between md:items-end mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-gray-900">Daftar Surat</h2>
                <p class="mt-1 text-sm text-slate-500">Kelola surat masuk dan keluar dengan tampilan ringkas, bersih, dan proporsional.</p>
            </div>
            <a href="{{ route('surat.create') }}"
               class="inline-flex items-center gap-2 bg-[#4B164C] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#3F125A] transition shadow-sm">
                <i class="bi bi-plus-lg"></i>Tambah Surat
            </a>
        </header>

        @if(session('success'))
        <div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-xl flex items-center gap-3">
            <i class="bi bi-check-circle-fill text-green-500 text-lg flex-shrink-0"></i>
            <span>{{ session('success') }}</span>
        </div>
        @endif

        <div class="transactions-card">
            <div class="table-toolbar">
                <div class="toolbar-select">
                    <span>Show</span>
                    <select id="entriesSelect" aria-label="Show entries">
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
                        <input id="tableSearch" type="search" class="search-input"
                               placeholder="Cari nomor, pengirim, nama surat…">
                    </div>
                </div>
            </div>

            <div class="table-scroll-wrap">
            <table id="tabelSurat" class="transactions-table">
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
                        <td class="text-gray-500">{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}</td>
                        <td class="text-gray-500">{{ $surat->tanggal_masuk ? \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') : '-' }}</td>
                        <td class="text-gray-700">{{ $surat->nama_pengirim }}</td>
                        <td class="text-gray-700">{{ $surat->nama_surat }}</td>
                        <td>
                            <div class="action-wrapper">
                                <!-- Lihat -->
                                <a href="#" class="action-btn view-btn" title="Lihat"
                                   data-file-url="{{ route('surat.preview', $surat->id) }}"
                                   data-pdf-url="{{ route('surat.preview.pdf', $surat->id) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-surat-number="{{ $surat->nomor_surat }}"
                                   data-tanggal-buat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}"
                                   data-tanggal-masuk="{{ $surat->tanggal_masuk ? \Carbon\Carbon::parse($surat->tanggal_masuk)->format('d/m/Y') : '-' }}"
                                   data-pengirim="{{ $surat->nama_pengirim }}"
                                   data-nama-surat="{{ $surat->nama_surat }}">
                                    <i class="bi bi-eye"></i>
                                </a>
                                <!-- Cetak -->
                                <a href="#" class="action-btn print-btn" title="Cetak"
                                   data-file-url="{{ route('surat.preview', $surat->id) }}"
                                   data-pdf-url="{{ route('surat.preview.pdf', $surat->id) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-nama-surat="{{ $surat->nama_surat }}">
                                    <i class="bi bi-printer"></i>
                                </a>
                                <!-- Edit -->
                                <a href="{{ route('surat.edit', $surat->id) }}" class="action-btn" title="Edit">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <!-- Hapus -->
                                <form action="{{ route('surat.destroy', $surat->id) }}" method="POST" class="inline-flex m-0"
                                      onsubmit="return confirm('Yakin hapus surat &quot;{{ $surat->nama_surat }}&quot;?');">
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
        </div>
    </main>

    <!-- ========= PREVIEW MODAL ========= -->
    <div id="previewModal" role="dialog" aria-modal="true" aria-labelledby="pvTitle">
        <div class="pv-dialog">

            <!-- Header -->
            <div class="pv-header">
                <span class="pv-title" id="pvTitle">Detail Surat</span>
                <div class="pv-header-btns">
                    <button type="button" id="pvPrintBtn" class="pv-hbtn pv-hbtn-print">
                        <i class="bi bi-printer"></i> Cetak
                    </button>
                    <button type="button" id="pvDownloadBtn" class="pv-hbtn pv-hbtn-dl">
                        <i class="bi bi-download"></i> Unduh
                    </button>
                    <button type="button" id="pvCloseBtn" class="pv-hbtn pv-hbtn-close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Meta -->
            <div class="pv-meta">
                <div class="pv-meta-item">
                    <div class="lbl">Nomor Surat</div>
                    <div class="val nomor" id="pvNomor">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Nama Surat</div>
                    <div class="val" id="pvNamaSurat">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Pengirim</div>
                    <div class="val" id="pvPengirim">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Tgl Buat</div>
                    <div class="val" id="pvTglBuat">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Tgl Masuk</div>
                    <div class="val" id="pvTglMasuk">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Format</div>
                    <div class="val" id="pvFormat">-</div>
                </div>
            </div>

            <!-- Sheet tabs (XLSX only) -->
            <div class="pv-sheet-tabs" id="pvSheetTabs"></div>

            <!-- Body -->
            <div class="pv-body" id="pvBody">

                <!-- Loading spinner -->
                <div class="pv-loading" id="pvLoading">
                    <div class="spin"></div>
                    <p>Memuat dokumen…</p>
                </div>

                <!-- PDF -->
                <div class="pv-panel" id="pvPanelIframe">
                    <iframe id="pvIframe" title="Preview Surat" allowfullscreen></iframe>
                </div>

                <!-- Image -->
                <div class="pv-panel" id="pvPanelImage">
                    <div id="pvImgWrap">
                        <img id="pvImg" src="" alt="Preview Surat">
                    </div>
                </div>

                <!-- DOCX -->
                <div class="pv-panel" id="pvPanelDocx">
                    <div id="pvDocxWrap">
                        <div id="pvDocxContent"></div>
                    </div>
                </div>

                <!-- XLSX -->
                <div class="pv-panel" id="pvPanelXlsx">
                    <div id="pvXlsxWrap"></div>
                </div>

                <!-- Unsupported -->
                <div class="pv-panel" id="pvPanelUnsupported">
                    <div id="pvUnsupported">
                        <i class="bi bi-file-earmark-x text-6xl text-gray-300 mb-4"></i>
                        <p class="font-semibold text-gray-600 mb-2">Pratinjau Tidak Tersedia</p>
                        <p class="text-sm text-gray-400 mb-5">
                            Format <strong id="pvUnsupportedExt"></strong> tidak dapat ditampilkan langsung.<br>
                            Silakan unduh file untuk membuka dan mencetaknya.
                        </p>
                        <a id="pvUnsupportedDl" href="#" download
                           class="inline-flex items-center gap-2 bg-[#4B164C] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#DD88CF] transition">
                            <i class="bi bi-download"></i> Unduh File
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ========= PRINT AREA (hidden on screen, visible during window.print()) ========= -->
    <div id="printArea"></div>

    <script>
    /* ================================================================
       SIDEBAR TOGGLE
    ================================================================ */
    document.getElementById('toggleBtn').addEventListener('click', () =>
        document.body.classList.toggle('sidebar-collapsed'));

    function openMobileSidebar() { document.body.classList.add('sidebar-mobile-open'); }
    function closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }
    document.querySelectorAll('#sidebar nav a').forEach(link => link.addEventListener('click', closeMobileSidebar));

    /* ================================================================
       HELPERS
    ================================================================ */
    const EXT_PDF   = ['pdf'];
    const EXT_IMG   = ['jpg','jpeg','png','gif','webp','bmp','svg'];
    const EXT_DOCX  = ['docx','doc'];
    const EXT_XLSX  = ['xlsx','xls','csv'];
    const EXT_FRAME = ['txt','html','htm'];

    function getExt(name) {
        return name ? name.split('.').pop().toLowerCase().trim() : '';
    }
    function escHtml(s) {
        return String(s||'')
            .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
            .replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    
    // Fungsi untuk mendeteksi apakah file adalah DOC (bukan DOCX)
    function isOldDocFormat(fileName) {
        const ext = getExt(fileName);
        return ext === 'doc';
    }

    /* ================================================================
       STATE
    ================================================================ */
    let currentFile = {};
    let xlsxWB      = null;   // cached workbook saat preview XLSX

    /* ================================================================
       PANEL MANAGEMENT
    ================================================================ */
    const PANELS = ['pvPanelIframe','pvPanelImage','pvPanelDocx','pvPanelXlsx','pvPanelUnsupported'];

    function hideAllPanels() {
        // Sembunyikan semua panel dengan paksa
        PANELS.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.classList.remove('show');
                panel.style.display = 'none';
            }
        });
        
        // Tampilkan loading
        const loading = document.getElementById('pvLoading');
        loading.style.display = 'flex';
        loading.classList.add('show');
        
        // Reset semua iframe dan konten
        document.getElementById('pvIframe').src = '';
        document.getElementById('pvImg').src   = '';
        document.getElementById('pvDocxContent').innerHTML = '';
        document.getElementById('pvXlsxWrap').innerHTML = '';
        document.getElementById('pvSheetTabs').classList.remove('show');
        document.getElementById('pvSheetTabs').innerHTML = '';
        xlsxWB = null;
    }

    function showPanel(id) {
        console.log('showPanel called for:', id); // Debug log
        
        // Pastikan semua panel tersembunyi dulu
        PANELS.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.remove('show');
                panel.style.display = 'none';
            }
        });
        
        // Sembunyikan loading
        const loading = document.getElementById('pvLoading');
        loading.style.display = 'none';
        loading.classList.remove('show');
        
        // Tampilkan panel yang diinginkan
        const targetPanel = document.getElementById(id);
        if (targetPanel) {
            targetPanel.style.display = 'flex';
            targetPanel.classList.add('show');
            console.log('Panel', id, 'shown successfully'); // Debug log
        } else {
            console.error('Panel not found:', id); // Debug log
        }
    }

    /* ================================================================
       OPEN PREVIEW
    ================================================================ */
    function openPreview(fileUrl, fileName, nomor, tglBuat, tglMasuk, pengirim, namaSurat, pdfUrl) {
        console.log('Opening preview for:', fileName, 'ext:', getExt(fileName)); // Debug log
        currentFile = { fileUrl, fileName, nomor, tglBuat, tglMasuk, pengirim, namaSurat, pdfUrl };
        const ext = getExt(fileName);

        // Fill meta
        document.getElementById('pvTitle').textContent   = namaSurat || 'Detail Surat';
        document.getElementById('pvNomor').textContent   = nomor      || '-';
        document.getElementById('pvNamaSurat').textContent = namaSurat|| '-';
        document.getElementById('pvPengirim').textContent = pengirim  || '-';
        document.getElementById('pvTglBuat').textContent  = tglBuat   || '-';
        document.getElementById('pvTglMasuk').textContent = tglMasuk  || '-';
        document.getElementById('pvFormat').textContent   = ext ? ext.toUpperCase() : '-';

        // Open modal
        document.getElementById('previewModal').classList.add('open');
        document.body.style.overflow = 'hidden';

        // Reset
        hideAllPanels();

        // Load by type - jangan ubah format lain yang sudah bekerja
        if (EXT_PDF.includes(ext) || EXT_FRAME.includes(ext)) {
            loadIframe(fileUrl);
        } else if (EXT_IMG.includes(ext)) {
            loadImage(fileUrl, fileName);
        } else if (EXT_DOCX.includes(ext)) {
            console.log('Loading DOCX file:', fileName); // Debug log
            // Coba pakai versi PDF hasil konversi server (akurat 1:1, termasuk
            // gambar EMF/WMF yang tidak bisa dibaca browser). Kalau endpoint
            // belum tersedia / gagal, otomatis fallback ke render docx-preview.
            if (pdfUrl) {
                loadDocxViaPdf(pdfUrl, fileUrl);
            } else {
                loadDocx(fileUrl);
            }
        } else if (EXT_XLSX.includes(ext)) {
            loadXlsx(fileUrl, ext);
        } else {
            console.log('Unsupported format:', ext); // Debug log
            showUnsupported(ext, fileUrl);
        }
    }

    function closePreview() {
        document.getElementById('previewModal').classList.remove('open');
        document.body.style.overflow = '';
        hideAllPanels();
        currentFile = {};
    }

    function showUnsupported(ext, fileUrl) {
        console.log('showUnsupported called for ext:', ext); // Debug log
        
        // Pastikan panel lain tersembunyi
        hideAllPanels();
        
        // Set data untuk unsupported panel
        document.getElementById('pvUnsupportedExt').textContent = '.' + ext;
        document.getElementById('pvUnsupportedDl').href = fileUrl;
        
        // Tampilkan unsupported panel
        showPanel('pvPanelUnsupported');
    }

    /* --- PDF / TXT / HTML --- */
    function loadIframe(fileUrl) {
        console.log('loadIframe called for:', fileUrl); // Debug log
        const fr = document.getElementById('pvIframe');
        fr.onload = () => {
            console.log('Iframe loaded successfully'); // Debug log
            showPanel('pvPanelIframe');
        };
        fr.onerror = () => {
            console.log('Iframe load error'); // Debug log
            showPanel('pvPanelIframe'); // Tetap tampilkan meski error
        };
        fr.src = fileUrl;
        setTimeout(() => { // fallback
            if (document.getElementById('pvLoading').style.display !== 'none') {
                console.log('Iframe timeout, showing panel anyway'); // Debug log
                showPanel('pvPanelIframe');
            }
        }, 3000);
    }

    /* --- Image --- */
    function loadImage(fileUrl, fileName) {
        const img = document.getElementById('pvImg');
        img.onload  = () => showPanel('pvPanelImage');
        img.onerror = () => showUnsupported(getExt(fileName), fileUrl);
        img.src = fileUrl;
    }

    /* --- DOCX (via PDF hasil konversi server) ---
       Jalur paling akurat: server mengonversi DOCX ke PDF pakai LibreOffice,
       lalu kita tampilkan lewat panel PDF yang sudah reliable. Ini otomatis
       menyelesaikan masalah gambar EMF/WMF, font, dan layout kompleks yang
       tidak bisa direproduksi 100% oleh docx-preview di browser.
       Kalau endpoint belum ada / server belum setup LibreOffice, otomatis
       fallback ke render docx-preview biasa. */
    async function loadDocxViaPdf(pdfUrl, fallbackFileUrl) {
        try {
            const head = await fetch(pdfUrl, { method: 'HEAD' });
            if (!head.ok) throw new Error('HTTP ' + head.status);

            const fr = document.getElementById('pvIframe');
            fr.onload = () => showPanel('pvPanelIframe');
            fr.onerror = () => loadDocx(fallbackFileUrl);
            fr.src = pdfUrl;

            setTimeout(() => {
                if (document.getElementById('pvLoading').style.display !== 'none') {
                    showPanel('pvPanelIframe');
                }
            }, 8000); // konversi pertama kali bisa agak lama
        } catch (err) {
            console.warn('[DOCX->PDF preview] Endpoint belum siap, fallback ke docx-preview:', err);
            loadDocx(fallbackFileUrl);
        }
    }

    /* --- DOCX ---
       Dirender langsung sebagai HTML memakai docx-preview (fetch -> blob -> renderAsync
       ke sebuah <div> container). TIDAK memakai iframe.src = fileUrl, karena itu membuat
       browser menganggapnya navigasi ke file dan langsung memicu dialog/­proses unduh
       (apalagi jika route server mengirim header Content-Disposition: attachment).
       Dengan fetch+blob, file hanya diambil sebagai data lalu dirender jadi HTML di layar. */
    async function loadDocx(fileUrl) {
        const fileName  = currentFile.fileName || '';
        const ext       = getExt(fileName);
        const container = document.getElementById('pvDocxContent');
        container.innerHTML = '';

        // Format .doc (biner lama) tidak didukung docx-preview (bukan format ZIP/OOXML)
        if (isOldDocFormat(fileName)) {
            showUnsupported(ext, fileUrl);
            return;
        }

        if (typeof window.docx === 'undefined') {
            console.error('[DOCX preview] Library docx-preview belum termuat');
            showUnsupported(ext, fileUrl);
            return;
        }

        try {
            const res = await fetch(fileUrl);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const blob = await res.blob();

            await window.docx.renderAsync(blob, container, container, {
                className: 'docx',
                inWrapper: true,
                ignoreLastRenderedPageBreak: false,
                ignoreWidth: false,
                ignoreHeight: false,
                breakPages: true,
                experimental: true,
                useBase64URL: true
            });

            showPanel('pvPanelDocx');
        } catch (err) {
            console.error('[DOCX preview]', err);
            showUnsupported(ext, fileUrl);
        }
    }

    /* --- XLSX / XLS / CSV --- */
    function loadXlsx(fileUrl, ext) {
        fetch(fileUrl)
            .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(ab => {
                xlsxWB = XLSX.read(ab, { type: 'array', cellStyles: true });
                const names = xlsxWB.SheetNames;

                // Build tabs if multiple sheets
                const tabsEl = document.getElementById('pvSheetTabs');
                if (names.length > 1) {
                    tabsEl.innerHTML = names.map((n, i) =>
                        `<button class="sheet-tab${i===0?' active':''}" data-sheet="${escHtml(n)}">${escHtml(n)}</button>`
                    ).join('');
                    tabsEl.classList.add('show');
                }

                renderXlsxSheet(names[0]);
                showPanel('pvPanelXlsx');
            })
            .catch(err => {
                console.error('[XLSX preview]', err);
                showUnsupported(ext, fileUrl);
            });
    }

    function renderXlsxSheet(name) {
        if (!xlsxWB) return;
        const ws  = xlsxWB.Sheets[name];
        const tbl = XLSX.utils.sheet_to_html(ws, { editable: false });
        document.getElementById('pvXlsxWrap').innerHTML =
            `<div class="xlsx-sheet-container">${tbl}</div>`;
    }

    // Sheet tab click
    document.addEventListener('click', e => {
        const tab = e.target.closest('.sheet-tab');
        if (!tab) return;
        document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderXlsxSheet(tab.dataset.sheet);
    });

    /* ================================================================
       CLOSE EVENTS
    ================================================================ */
    document.getElementById('pvCloseBtn').addEventListener('click', closePreview);
    document.getElementById('previewModal').addEventListener('click', e => {
        if (e.target === document.getElementById('previewModal')) closePreview();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

    /* ================================================================
       DOWNLOAD
    ================================================================ */
    document.getElementById('pvDownloadBtn').addEventListener('click', () => {
        if (!currentFile.fileUrl) return;
        const a = document.createElement('a');
        a.href     = currentFile.fileUrl;
        a.download = currentFile.fileName || 'surat';
        a.click();
    });

    /* ================================================================
       CETAK — in-page render untuk semua format
       (menghindari popup blocker & masalah CORS)
    ================================================================ */
    async function printSurat(fileUrl, fileName, pdfUrl) {
        const ext = getExt(fileName);

        if (EXT_PDF.includes(ext) || EXT_FRAME.includes(ext)) {
            /* PDF / TXT: buka tab baru, biarkan browser handle print */
            const pw = window.open(fileUrl, '_blank', 'width=960,height=720');
            if (pw) {
                pw.addEventListener('load', () => setTimeout(() => pw.print(), 400));
            } else {
                alert('Izinkan popup untuk mencetak PDF. Atau gunakan tombol Unduh lalu buka & cetak manual.');
            }

        } else if (EXT_IMG.includes(ext)) {
            /* Gambar: render ke printArea, print in-page */
            setPrintArea(`<div class="print-img-wrap"><img src="${escHtml(fileUrl)}" alt="${escHtml(fileName)}"></div>`);
            // Tunggu gambar load
            const img = document.querySelector('#printArea img');
            await new Promise(res => {
                if (img.complete) { res(); return; }
                img.onload  = res;
                img.onerror = res;
            });
            doPrint();

        } else if (EXT_DOCX.includes(ext)) {
            /* DOCX: coba cetak via PDF hasil konversi server dulu (akurat,
               support EMF/WMF). Fallback ke render docx-preview kalau gagal. */

            if (pdfUrl) {
                try {
                    const head = await fetch(pdfUrl, { method: 'HEAD' });
                    if (head.ok) {
                        const pw = window.open(pdfUrl, '_blank', 'width=960,height=720');
                        if (pw) {
                            pw.addEventListener('load', () => setTimeout(() => pw.print(), 400));
                        } else {
                            alert('Izinkan popup untuk mencetak. Atau gunakan tombol Unduh lalu buka & cetak manual.');
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('[DOCX print via PDF] gagal, fallback ke docx-preview:', err);
                }
            }

            /* Fallback: render ulang khusus untuk cetak, memakai docx-preview */

            if (isOldDocFormat(fileName)) {
                alert('Format .doc (lama) tidak dapat dicetak otomatis.\nFile akan diunduh agar dapat dibuka dan dicetak secara manual.');
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName || 'surat';
                a.click();
                return;
            }

            if (typeof window.docx === 'undefined') {
                alert('Library dokumen belum siap. File akan diunduh untuk dicetak secara manual.');
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName || 'surat';
                a.click();
                return;
            }
            
            setPrintArea('<p style="padding:16px;color:#888;">Menyiapkan dokumen untuk dicetak…</p>');
            showPrintOverlay(true);
            
            // Container sementara di luar layar — docx-preview WAJIB diberi elemen DOM
            // nyata untuk dirender (tidak bisa null), lalu HTML hasilnya diambil dari sini.
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = 'position:fixed; left:-99999px; top:0;';
            document.body.appendChild(tempContainer);

            try {
                const blob = await fetch(fileUrl).then(r => r.blob());
                await window.docx.renderAsync(blob, tempContainer, tempContainer, {
                    ignoreLastRenderedPageBreak: false,
                    inWrapper: true,
                    experimental: false,
                    useBase64URL: true,
                    className: "docx-print"
                });
                const htmlString = tempContainer.innerHTML;
                tempContainer.remove();
                
                const printHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { 
                                font-family: 'Times New Roman', serif; 
                                margin: 0; 
                                padding: 0; 
                                background: #fff;
                            }
                            .docx-print { 
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                            .docx-print table { 
                                width: 100% !important; 
                                border-collapse: collapse !important; 
                                page-break-inside: auto;
                            }
                            .docx-print table td, 
                            .docx-print table th { 
                                border: 1px solid #000 !important; 
                                padding: 4px 8px !important; 
                            }
                            .docx-print img { 
                                max-width: 100% !important; 
                                height: auto !important; 
                                page-break-inside: avoid;
                            }
                            .docx-print p { 
                                margin: 3px 0; 
                            }
                        </style>
                    </head>
                    <body>
                        <div class="docx-print">${htmlString}</div>
                    </body>
                    </html>
                `;
                
                setPrintArea(printHtml);
                showPrintOverlay(false);
                doPrint();
                
            } catch (err) {
                tempContainer.remove();
                showPrintOverlay(false);
                console.error('[DOCX print]', err);
                alert('Gagal menyiapkan dokumen untuk dicetak. File akan diunduh untuk dibuka secara manual.');
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName || 'surat';
                a.click();
            }

        } else if (EXT_XLSX.includes(ext)) {
            /* XLSX: fetch → SheetJS → HTML tabel → printArea → print */
            setPrintArea('<p style="padding:16px;color:#888;">Menyiapkan spreadsheet untuk dicetak…</p>');
            showPrintOverlay(true);
            try {
                const ab = await fetch(fileUrl).then(r => r.arrayBuffer());
                const wb = XLSX.read(ab, { type: 'array' });
                let html = '<div class="print-xlsx-wrap">';
                wb.SheetNames.forEach(name => {
                    html += `<h3 style="font-family:Arial;font-size:12pt;margin:14px 0 4px;">Sheet: ${escHtml(name)}</h3>`;
                    html += XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false });
                });
                html += '</div>';
                setPrintArea(html);
                showPrintOverlay(false);
                doPrint();
            } catch (err) {
                showPrintOverlay(false);
                console.error('[XLSX print]', err);
                alert('Gagal menyiapkan spreadsheet untuk dicetak. Coba gunakan tombol Unduh.');
            }

        } else {
            alert(`Format .${ext} tidak dapat dicetak otomatis.\nFile akan diunduh agar dapat dibuka dan dicetak secara manual.`);
            const a = document.createElement('a');
            a.href     = fileUrl;
            a.download = fileName || 'surat';
            a.click();
        }
    }

    function setPrintArea(html) {
        document.getElementById('printArea').innerHTML = html;
    }

    function doPrint() {
        document.body.classList.add('is-printing');
        setTimeout(() => {
            window.print();
            // Bersihkan setelah dialog print ditutup
            setTimeout(() => {
                document.body.classList.remove('is-printing');
                document.getElementById('printArea').innerHTML = '';
            }, 1000);
        }, 400);
    }

    /* Overlay "Menyiapkan…" agar user tahu proses sedang berjalan */
    function showPrintOverlay(show) {
        let ov = document.getElementById('printOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'printOverlay';
            ov.innerHTML = `
                <div style="background:#fff;border-radius:16px;padding:32px 40px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.25);">
                    <div style="width:44px;height:44px;border:4px solid #e9d5ff;border-top-color:#4B164C;border-radius:50%;animation:pv-spin .75s linear infinite;margin:0 auto 16px;"></div>
                    <p style="font-family:Poppins,sans-serif;color:#374151;font-size:.92rem;">Menyiapkan dokumen untuk dicetak…</p>
                </div>`;
            Object.assign(ov.style, {
                position:'fixed', inset:'0', zIndex:'99999',
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(0,0,0,.45)'
            });
            document.body.appendChild(ov);
        }
        ov.style.display = show ? 'flex' : 'none';
    }

    /* ================================================================
       DATATABLE + EVENT BINDING
    ================================================================ */
    $(document).ready(function () {
        const dt = $('#tabelSurat').DataTable({
            responsive: true,
            dom: 't<"flex flex-col sm:flex-row justify-between items-center mt-4"ip>',
            language: {
                search: '',
                lengthMenu: '_MENU_',
                info: 'Data _START_ – _END_ dari _TOTAL_',
                paginate: {
                    previous: "<i class='bi bi-chevron-left'></i>",
                    next: "<i class='bi bi-chevron-right'></i>"
                }
            }
        });

        $('#tableSearch').on('input', function () { dt.search(this.value).draw(); });
        $('#entriesSelect').on('change', function () { dt.page.len(this.value).draw(); });

        /* Tombol Lihat */
        $(document).on('click', '.view-btn', function (e) {
            e.preventDefault();
            const d = $(this).data();
            openPreview(d.fileUrl, d.fileName, d.suratNumber,
                        d.tanggalBuat, d.tanggalMasuk, d.pengirim, d.namaSurat, d.pdfUrl);
        });

        /* Tombol Cetak (di tabel) */
        $(document).on('click', '.print-btn', function (e) {
            e.preventDefault();
            const d = $(this).data();
            printSurat(d.fileUrl, d.fileName, d.pdfUrl);
        });

        /* Tombol Cetak (di modal) */
        $('#pvPrintBtn').on('click', function () {
            if (currentFile.fileUrl) printSurat(currentFile.fileUrl, currentFile.fileName, currentFile.pdfUrl);
        });
    });
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>