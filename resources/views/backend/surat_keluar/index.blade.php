<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manajemen Surat Keluar – E-Surat</title>
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

    <style>
        /* ===== Base ===== */
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }

        /* ── Primary button ── */
        .btn-primary {
            background: linear-gradient(135deg, #4B164C 0%, #7B2D7C 55%, #DD88CF 100%);
            color: #fff;
            transition: all 300ms ease;
            border: none;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #3e123c 0%, #6B1D6C 55%, #C878BF 100%);
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(75, 22, 76, 0.35);
        }

        /* ===== Sidebar ===== */
        #sidebar {
            transition: width 0.3s, transform 0.3s;
            width: 260px;
            position: fixed;
            height: 100vh;
            z-index: 100;
            background: #ffffff;
            border-right: 1px solid #e5e7eb;
            overflow: hidden;
            overflow-y: auto;
        }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none !important; }
        body.sidebar-collapsed #sidebar nav a { justify-content: center; padding-left: 0 !important; padding-right: 0 !important; }
        body.sidebar-collapsed #sidebar .sidebar-logo { display: none !important; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

        /* Hide scrollbar for sidebar */
        #sidebar::-webkit-scrollbar {
            width: 4px;
        }
        #sidebar::-webkit-scrollbar-track {
            background: transparent;
        }
        #sidebar::-webkit-scrollbar-thumb {
            background: #e5e7eb;
            border-radius: 2px;
        }
        #sidebar::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
        }

        /* ===== Toolbar ===== */
        .table-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.25rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #F1F5F9;
        }
        .toolbar-select { display: inline-flex; align-items: center; gap: .5rem; color: #475569; font-size: .88rem; }
        .toolbar-select select {
            min-width: 4rem;
            padding: .45rem .75rem;
            border: 1px solid #E2E8F0;
            border-radius: .625rem;
            background: #F8FAFC;
            color: #1E293B;
            font-size: .88rem;
            font-weight: 500;
            outline: none;
            transition: all .2s;
        }
        .toolbar-select select:focus { border-color: #DD88CF; background: #fff; box-shadow: 0 0 0 3px rgba(221,136,207,.15); }
        .toolbar-search { max-width: 320px; width: 100%; }
        .search-input {
            width: 100%;
            min-height: 42px;
            padding: .6rem 1rem .6rem 2.6rem;
            border: 1px solid #E2E8F0;
            border-radius: .75rem;
            background: #F8FAFC;
            color: #1E293B;
            font-size: .88rem;
            transition: all .2s;
        }
        .search-input:focus { outline: none; background: #fff; border-color: #DD88CF; box-shadow: 0 0 0 4px rgba(221,136,207,.15); }
        .search-icon { position: absolute; left: .9rem; top: 50%; transform: translateY(-50%); font-size: .95rem; color: #94A3B8; }

        /* ===== Table Card ===== */
        .transactions-card {
            background: #fff;
            border-radius: 20px;
            padding: 24px;
            border: 1px solid #EAECF0;
            box-shadow: 0 4px 20px rgba(15,23,42,.03);
        }
        .table-scroll-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 14px;
            border: 1px solid #F1F5F9;
        }
        .transactions-table {
            width: 100% !important;
            min-width: 780px;
            border-collapse: separate !important;
            border-spacing: 0 !important;
        }
        .transactions-table thead tr { background: #FAF7FC !important; }
        .transactions-table thead th {
            color: #64748B !important;
            font-weight: 600 !important;
            padding: 14px 18px !important;
            border-bottom: 1px solid #F1F5F9 !important;
            font-size: .75rem !important;
            text-transform: uppercase !important;
            letter-spacing: .05em !important;
        }
        .transactions-table tbody tr {
            transition: background .15s ease;
            border-bottom: 1px solid #F1F5F9;
        }
        .transactions-table tbody tr:hover { background: #FAF5FF !important; }
        .transactions-table tbody tr:last-child td { border-bottom: none !important; }
        .transactions-table tbody td {
            padding: 14px 18px !important;
            color: #334155 !important;
            font-size: .9rem !important;
            vertical-align: middle !important;
        }
        .dataTables_wrapper .dataTables_filter,
        .dataTables_wrapper .dataTables_length { display: none !important; }

        /* DataTables Custom Pagination & Info */
        .dataTables_wrapper .dataTables_info {
            color: #64748B !important;
            font-size: .82rem !important;
            padding-top: 1rem !important;
        }
        .dataTables_wrapper .dataTables_paginate {
            padding-top: 1rem !important;
            display: flex !important;
            gap: 4px !important;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button {
            border-radius: 8px !important;
            border: 1px solid #E2E8F0 !important;
            background: #fff !important;
            color: #475569 !important;
            font-size: .82rem !important;
            font-weight: 500 !important;
            padding: 4px 10px !important;
            cursor: pointer !important;
            transition: all .15s !important;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
            background: #F1F5F9 !important;
            border-color: #CBD5E1 !important;
            color: #0F172A !important;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button.current,
        .dataTables_wrapper .dataTables_paginate .paginate_button.current:hover {
            background: #4B164C !important;
            border-color: #4B164C !important;
            color: #fff !important;
            font-weight: 600 !important;
        }

        /* ===== Action buttons ===== */
        .action-wrapper { display: inline-flex; gap: 8px; align-items: center; justify-content: flex-end; }
        .action-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 35px; height: 35px; border-radius: 10px;
            font-size: .9rem; transition: all .2s ease;
            cursor: pointer; text-decoration: none; border: 1px solid transparent;
        }
        .action-btn.view-btn { background: #F3E8FF; color: #7E22CE; border-color: #E9D5FF; }
        .action-btn.view-btn:hover { background: #7E22CE; color: #fff; border-color: #7E22CE; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(126,34,206,.2); }

        .action-btn.print-btn { background: #E0F2FE; color: #0369A1; border-color: #BAE6FD; }
        .action-btn.print-btn:hover { background: #0284C7; color: #fff; border-color: #0284C7; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(2,132,199,.2); }

        .action-btn.edit-btn { background: #FEF3C7; color: #B45309; border-color: #FDE68A; }
        .action-btn.edit-btn:hover { background: #D97706; color: #fff; border-color: #D97706; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(217,119,6,.2); }

        .action-btn.delete-btn { background: #FEE2E2; color: #B91C1C; border-color: #FECACA; }
        .action-btn.delete-btn:hover { background: #DC2626; color: #fff; border-color: #DC2626; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(220,38,38,.2); }

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
        @media (min-width: 860px) { .pv-meta { grid-template-columns: repeat(7, 1fr); } }
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

        /* ===== Panel Management ===== */
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

        /* DOCX */
        #pvDocxWrap {
            flex: 1;
            min-height: 0;
            padding: 24px;
            position: relative;
            background: #eef0f3;
            overflow: auto;
        }

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

        /* ===== PRINT AREA ===== */
        #printArea { display: none; }

        @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            body.is-printing > *:not(#printArea) { display: none !important; }
            body.is-printing #printArea {
                display: block !important;
                position: static !important;
                width: 100%;
                margin: 0;
                padding: 0;
            }

            #printArea .docx-wrapper {
                background: #fff !important;
                padding: 0 !important;
            }
            #printArea .docx-wrapper > section.docx {
                box-shadow: none !important;
                margin: 0 auto !important;
            }
            #printArea img { max-width: 100% !important; }

            #printArea .print-xlsx-wrap {
                font-family: Calibri, Arial, sans-serif;
                font-size: 11pt;
            }
            #printArea .print-xlsx-wrap .sheet-title {
                font-size: 12pt;
                font-weight: 700;
                margin: 18px 0 6px;
                color: #111;
            }
            #printArea .print-xlsx-wrap table {
                border-collapse: collapse;
                width: 100%;
                table-layout: fixed;
                page-break-inside: auto;
            }
            #printArea .print-xlsx-wrap tr { page-break-inside: avoid; }
            #printArea .print-xlsx-wrap th,
            #printArea .print-xlsx-wrap td {
                border: 1px solid #aaa;
                padding: 3px 6px;
                word-break: break-word;
                vertical-align: middle;
                font-size: 10pt;
            }

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
            .pv-header { padding: 12px 16px; }
            .pv-title { font-size: .85rem; }
            .pv-hbtn { padding: 5px 10px; font-size: .75rem; }
            .pv-meta { grid-template-columns: 1fr 1fr; gap: 8px 12px; padding: 12px 16px; }
            .pv-meta-item .lbl { font-size: .6rem; }
            .pv-meta-item .val { font-size: .75rem; }
            .transactions-table thead th { padding: 10px 8px !important; font-size: .65rem !important; }
            .transactions-table tbody td { padding: 10px 8px !important; font-size: .8rem !important; }
            .action-btn { width: 30px; height: 30px; font-size: .8rem; }
        }
        @media (max-width: 1024px) {
            .pv-dialog { max-width: 100vw; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
            .transactions-table { min-width: 640px; }
            .transactions-table thead th { padding: 13px 12px !important; font-size: .8rem !important; }
            .transactions-table tbody td { padding: 13px 12px !important; font-size: .88rem !important; }
        }

        @media (max-width: 768px) {
            .table-toolbar { flex-direction: column; align-items: stretch; gap: 0.75rem; }
            .toolbar-search { max-width: 100%; }
            .toolbar-select { justify-content: space-between; }
        }

        /* Prevent text selection */
        .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        /* Hide scrollbars but keep functionality */
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        /* ===== Responsive: Mobile Sidebar ===== */
        #sidebarOverlay { display: none; }
        @media (max-width: 1023px) {
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

    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
    <script>
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>
    <script>
        // Proteksi ringan - hanya disable right-click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
    </script>
    @include('partials.dark-mode-styles')
    <link rel="icon" type="image/svg+xml" href="{{ asset('image/favicon-esurat.svg') }}">
    <link rel="shortcut icon" type="image/svg+xml" href="{{ asset('image/favicon-esurat.svg') }}">
</head>
<body>

    <!-- Mobile Topbar -->
    <header class="lg:hidden sticky top-0 z-[80] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
        <button type="button" onclick="toggleMobileSidebar()" class="p-2 rounded-xl text-slate-700 hover:bg-slate-100"><i class="bi bi-list text-2xl"></i></button>
        <a href="{{ route('dashboard') }}" class="flex items-center">
            <img src="{{ asset('image/logo-esurat-light.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-light">
            <img src="{{ asset('image/logo-esurat-dark.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-dark">
        </a>
        <span class="w-9"></span>
    </header>
    <div id="sidebarOverlay" onclick="closeMobileSidebar()"></div>

    <!-- ========= SIDEBAR ========= -->
    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4 border-b border-gray-100">
            <button id="toggleBtn" class="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition">
                <i class="bi bi-list text-2xl"></i>
            </button>
            <a href="{{ route('dashboard') }}" class="ml-3 flex items-center sidebar-logo">
                <img src="{{ asset('image/logo-esurat-light.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-light">
                <img src="{{ asset('image/logo-esurat-dark.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-dark">
            </a>
        </div>
        <nav class="flex-1 p-3 space-y-2 mt-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
                <i class="bi bi-grid-1x2-fill text-lg"></i>
                <span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
                <i class="bi bi-envelope-fill text-lg"></i>
                <span class="ml-4 menu-text">Surat Masuk</span>
            </a>
            <a href="{{ route('surat_keluar.index') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C] font-medium">
                <i class="bi bi-send-fill text-lg"></i>
                <span class="ml-4 menu-text">Surat Keluar</span>
            </a>
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
                <i class="bi bi-person-fill text-lg"></i>
                <span class="ml-4 menu-text">Profil</span>
            </a>
            <div class="mt-4 border-t border-gray-100 pt-4">
                <button type="button" onclick="openLogoutModal()"
                        class="w-full flex items-center p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
                    <i class="bi bi-box-arrow-right text-lg"></i>
                    <span class="ml-4 menu-text">Keluar</span>
                </button>
            </div>
        </nav>
    </aside>

    <!-- ========= MAIN ========= -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <header class="flex flex-col gap-4 md:flex-row md:justify-between md:items-end mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-gray-900">Daftar Surat Keluar</h2>
                <p class="mt-1 text-sm text-slate-500">Kelola surat keluar dengan tampilan ringkas, bersih, dan proporsional.</p>
            </div>
            <a href="{{ route('surat_keluar.create') }}"
               class="btn-primary inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm">
                <i class="bi bi-plus-lg"></i>Tambah Surat Keluar
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
                    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Tampilkan</span>
                    <select id="entriesSelect" aria-label="Tampilkan entri">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Data</span>
                    <span class="ml-2 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#4B164C] border border-purple-100">
                        Total {{ $surats->count() }} Surat Keluar
                    </span>
                </div>
                <div class="toolbar-search">
                    <div class="relative">
                        <i class="bi bi-search search-icon"></i>
                        <input id="tableSearch" type="search" class="search-input"
                               placeholder="Cari nomor, penerima, atau perihal surat…">
                    </div>
                </div>
            </div>

            <div class="table-scroll-wrap">
            <table id="tabelSurat" class="transactions-table">
                <thead>
                    <tr>
                        <th class="w-12 text-center">No</th>
                        <th>Nomor Surat</th>
                        <th>Perihal / Nama Surat</th>
                        <th>Penerima</th>
                        <th>Tgl Buat</th>
                        <th>Tgl Keluar</th>
                        <th class="text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($surats as $surat)
                    <tr>
                        <td class="text-center font-medium text-slate-400" data-label="No">
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">{{ $loop->iteration }}</span>
                        </td>
                        <td data-label="Nomor Surat">
                            <span class="font-semibold text-[#4B164C] bg-purple-50/80 border border-purple-100 px-2.5 py-1 rounded-lg text-[13px] inline-block shadow-2xs">
                                {{ $surat->nomor_surat }}
                            </span>
                        </td>
                        <td data-label="Nama Surat">
                            <div class="font-semibold text-slate-800 text-[14px] leading-snug">{{ $surat->nama_surat }}</div>
                            <div class="text-xs text-slate-400 font-normal mt-0.5 flex items-center gap-1.5 truncate max-w-xs" title="{{ $surat->nama_file }}">
                                <i class="bi bi-file-earmark-text text-[#DD88CF]"></i> {{ $surat->nama_file }}
                            </div>
                        </td>
                        <td data-label="Penerima">
                            <div class="inline-flex items-center gap-2 text-slate-700 text-[13.5px]">
                                <i class="bi bi-send text-slate-400 text-sm"></i>
                                <span>{{ $surat->nama_penerima }}</span>
                            </div>
                        </td>
                        <td data-label="Tgl Buat">
                            <span class="text-slate-600 text-[13px] font-medium">{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}</span>
                        </td>
                        <td data-label="Tgl Keluar">
                            <span class="text-slate-600 text-[13px] font-medium">{{ $surat->tanggal_keluar ? \Carbon\Carbon::parse($surat->tanggal_keluar)->format('d/m/Y') : '-' }}</span>
                        </td>
                        <td data-label="Aksi" class="text-right">
                            <div class="action-wrapper">
                                <!-- Lihat -->
                                <a href="#" class="action-btn view-btn" title="Lihat Detail & Preview"
                                    data-file-url="{{ route('surat_keluar.preview', [$surat->id, $surat->nama_file]) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-surat-number="{{ $surat->nomor_surat }}"
                                   data-tanggal-buat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->format('d/m/Y') }}"
                                   data-tanggal-keluar="{{ $surat->tanggal_keluar ? \Carbon\Carbon::parse($surat->tanggal_keluar)->format('d/m/Y') : '-' }}"
                                   data-penerima="{{ $surat->nama_penerima }}"
                                   data-nama-surat="{{ $surat->nama_surat }}">
                                    <i class="bi bi-eye"></i>
                                </a>
                                <!-- Cetak -->
                                <a href="#" class="action-btn print-btn" title="Cetak Surat"
                                   data-file-url="{{ route('surat_keluar.preview', [$surat->id, $surat->nama_file]) }}"
                                   data-file-name="{{ $surat->nama_file }}"
                                   data-nama-surat="{{ $surat->nama_surat }}">
                                    <i class="bi bi-printer"></i>
                                </a>
                                <!-- Edit -->
                                <a href="{{ route('surat_keluar.edit', $surat->id) }}" class="action-btn edit-btn" title="Edit Surat">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <!-- Hapus -->
                                <form action="{{ route('surat_keluar.destroy', $surat->id) }}" method="POST" class="inline-flex m-0"
                                      onsubmit="return confirm('Yakin hapus surat keluar &quot;{{ $surat->nama_surat }}&quot;?');">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="action-btn delete-btn" title="Hapus Surat"><i class="bi bi-trash"></i></button>
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
                <span class="pv-title" id="pvTitle">Detail Surat Keluar</span>
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
                    <div class="lbl">Tanggal Buat</div>
                    <div class="val" id="pvTanggalBuat">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Tanggal Keluar</div>
                    <div class="val" id="pvTanggalKeluar">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Penerima</div>
                    <div class="val" id="pvPenerima">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Nama Surat</div>
                    <div class="val" id="pvNamaSurat">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Nama File</div>
                    <div class="val" id="pvNamaFile">-</div>
                </div>
                <div class="pv-meta-item">
                    <div class="lbl">Status</div>
                    <div class="val" id="pvStatus">-</div>
                </div>
            </div>

            <!-- Sheet tabs (XLSX) -->
            <div id="pvSheetTabs" class="pv-sheet-tabs"></div>

            <!-- Body -->
            <div class="pv-body">
                <!-- Loading -->
                <div id="pvLoading" class="pv-loading">
                    <div class="spin"></div>
                    <p>Memuat dokumen...</p>
                </div>

                <!-- Panels -->
                <div id="pvPanelIframe" class="pv-panel">
                    <iframe id="pvIframe"></iframe>
                </div>

                <div id="pvPanelImage" class="pv-panel">
                    <div id="pvImgWrap">
                        <img id="pvImg" alt="Preview">
                    </div>
                </div>

                <div id="pvPanelDocx" class="pv-panel">
                    <div id="pvDocxWrap">
                        <div id="pvDocxContent"></div>
                    </div>
                </div>

                <div id="pvPanelXlsx" class="pv-panel">
                    <div id="pvXlsxWrap"></div>
                </div>

                <div id="pvPanelUnsupported" class="pv-panel">
                    <div id="pvUnsupported">
                        <i class="bi bi-file-earmark-x" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>Format file ini tidak didukung untuk preview.</p>
                        <p class="text-sm mt-2">Silakan unduh file untuk melihat isinya.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Print Area (hidden on screen) -->
    <div id="printArea"></div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            document.body.classList.remove('sidebar-mobile-open');
        });
        document.getElementById('toggleBtn')?.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                closeMobileSidebar();
            } else {
                document.body.classList.toggle('sidebar-collapsed');
            }
        });
        function toggleMobileSidebar() { document.body.classList.toggle('sidebar-mobile-open'); }
        function openMobileSidebar() { document.body.classList.add('sidebar-mobile-open'); }
        function closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }

        document.querySelectorAll('#sidebar nav a').forEach(link => {
            link.addEventListener('click', closeMobileSidebar);
        });

        // DataTables
        $(document).ready(function() {
            var table = $('#tabelSurat').DataTable({
                pageLength: 10,
                lengthMenu: [10, 25, 50, 100],
                language: {
                    search: "",
                    lengthMenu: "Tampilkan _MENU_ data",
                    info: "Menampilkan _START_ - _END_ dari _TOTAL_ data",
                    paginate: {
                        first: "Pertama",
                        last: "Terakhir",
                        next: "Selanjutnya",
                        previous: "Sebelumnya"
                    }
                }
            });

            $('#entriesSelect').on('change', function() {
                table.page.len($(this).val()).draw();
            });

            $('#tableSearch').on('keyup', function() {
                table.search($(this).val()).draw();
            });
        });

        // Preview Modal
        const previewModal = document.getElementById('previewModal');
        const pvCloseBtn = document.getElementById('pvCloseBtn');
        const pvPrintBtn = document.getElementById('pvPrintBtn');
        const pvDownloadBtn = document.getElementById('pvDownloadBtn');
        let currentFileUrl = '';
        let currentFileName = '';
        let currentFileType = '';

        document.querySelectorAll('.action-btn.view-btn, .action-btn.print-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                currentFileUrl = this.dataset.fileUrl;
                currentFileName = this.dataset.fileName;
                
                // Set meta data
                document.getElementById('pvNomor').textContent = this.dataset.suratNumber || '-';
                document.getElementById('pvTanggalBuat').textContent = this.dataset.tanggalBuat || '-';
                document.getElementById('pvTanggalKeluar').textContent = this.dataset.tanggalKeluar || '-';
                document.getElementById('pvPenerima').textContent = this.dataset.penerima || '-';
                document.getElementById('pvNamaSurat').textContent = this.dataset.namaSurat || '-';
                document.getElementById('pvNamaFile').textContent = currentFileName;
                document.getElementById('pvStatus').textContent = '-';

                openPreviewModal(currentFileUrl, currentFileName);
            });
        });

        pvCloseBtn.addEventListener('click', closePreviewModal);
        previewModal.addEventListener('click', function(e) {
            if (e.target === previewModal) closePreviewModal();
        });

        pvPrintBtn.addEventListener('click', function() {
            if (currentFileType === 'pdf') {
                document.getElementById('pvIframe').contentWindow.print();
            } else {
                window.print();
            }
        });

        pvDownloadBtn.addEventListener('click', function() {
            const link = document.createElement('a');
            link.href = currentFileUrl;
            link.download = currentFileName;
            link.click();
        });

        function openPreviewModal(url, filename) {
            previewModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            
            // Hide all panels
            document.querySelectorAll('.pv-panel').forEach(p => p.classList.remove('show'));
            document.getElementById('pvLoading').classList.add('show');

            const ext = filename.split('.').pop().toLowerCase();
            currentFileType = ext;

            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    document.getElementById('pvLoading').classList.remove('show');
                    
                    if (ext === 'pdf') {
                        const blobUrl = URL.createObjectURL(blob);
                        document.getElementById('pvIframe').src = blobUrl;
                        document.getElementById('pvPanelIframe').classList.add('show');
                    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                        const blobUrl = URL.createObjectURL(blob);
                        document.getElementById('pvImg').src = blobUrl;
                        document.getElementById('pvPanelImage').classList.add('show');
                    } else if (ext === 'docx') {
                        const blobUrl = URL.createObjectURL(blob);
                        docx.renderAsync(blobUrl, document.getElementById('pvDocxContent'))
                            .then(() => {
                                document.getElementById('pvPanelDocx').classList.add('show');
                            })
                            .catch(() => {
                                document.getElementById('pvPanelUnsupported').classList.add('show');
                            });
                    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                        const blobUrl = URL.createObjectURL(blob);
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, {type: 'array'});
                            
                            const tabsContainer = document.getElementById('pvSheetTabs');
                            tabsContainer.innerHTML = '';
                            tabsContainer.classList.add('show');
                            
                            const xlsxWrap = document.getElementById('pvXlsxWrap');
                            xlsxWrap.innerHTML = '';
                            
                            workbook.SheetNames.forEach((sheetName, index) => {
                                const tab = document.createElement('div');
                                tab.className = 'sheet-tab' + (index === 0 ? ' active' : '');
                                tab.textContent = sheetName;
                                tab.addEventListener('click', function() {
                                    document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('active'));
                                    this.classList.add('active');
                                    document.querySelectorAll('.xlsx-sheet-container').forEach(c => c.style.display = 'none');
                                    document.getElementById('sheet-' + index).style.display = 'block';
                                });
                                tabsContainer.appendChild(tab);
                                
                                const worksheet = workbook.Sheets[sheetName];
                                const html = XLSX.utils.sheet_to_html(worksheet);
                                const container = document.createElement('div');
                                container.className = 'xlsx-sheet-container';
                                container.id = 'sheet-' + index;
                                container.style.display = index === 0 ? 'block' : 'none';
                                container.innerHTML = html;
                                xlsxWrap.appendChild(container);
                            });
                            
                            document.getElementById('pvPanelXlsx').classList.add('show');
                        };
                        reader.readAsArrayBuffer(blob);
                    } else {
                        document.getElementById('pvPanelUnsupported').classList.add('show');
                    }
                })
                .catch(() => {
                    document.getElementById('pvLoading').classList.remove('show');
                    document.getElementById('pvPanelUnsupported').classList.add('show');
                });
        }

        function closePreviewModal() {
            previewModal.classList.remove('open');
            document.body.style.overflow = '';
            document.getElementById('pvIframe').src = '';
            document.getElementById('pvImg').src = '';
            document.getElementById('pvDocxContent').innerHTML = '';
            document.getElementById('pvXlsxWrap').innerHTML = '';
            document.getElementById('pvSheetTabs').innerHTML = '';
            document.getElementById('pvSheetTabs').classList.remove('show');
            document.querySelectorAll('.pv-panel').forEach(p => p.classList.remove('show'));
        }

        // Keyboard close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && previewModal.classList.contains('open')) {
                closePreviewModal();
            }
        });
    </script>

    @include('profile.partials.logout-modal')
    @include('partials.security')
</body>
</html>
