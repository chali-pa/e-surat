<style>
    /* ── Dark Mode: Base ── */
    html.dark body { background-color: #0f172a !important; color: #e2e8f0 !important; }
    html.dark #sidebar { background-color: #1e293b !important; border-color: #334155 !important; }
    html.dark .bg-white { background-color: #1e293b !important; color: #e2e8f0 !important; }
    html.dark .bg-gray-50, html.dark .bg-slate-50,
    html.dark .bg-\[\#F4F6F9\], html.dark .bg-\[\#F9FAFB\] { background-color: #0f172a !important; }
    html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-\[\#1a1a2e\] { color: #f1f5f9 !important; }
    html.dark .text-gray-700 { color: #cbd5e1 !important; }
    html.dark .text-gray-600, html.dark .text-gray-500, html.dark .text-slate-500 { color: #94a3b8 !important; }
    html.dark .text-slate-700 { color: #cbd5e1 !important; }
    html.dark .text-slate-600 { color: #94a3b8 !important; }
    html.dark .text-slate-900 { color: #f1f5f9 !important; }
    html.dark .text-slate-800 { color: #e2e8f0 !important; }
    html.dark .text-slate-400 { color: #94a3b8 !important; }
    html.dark .border-gray-200, html.dark .border-gray-100,
    html.dark .border-slate-100, html.dark .border-\[\#eaecf0\],
    html.dark .border-\[\#e5e7eb\] { border-color: #334155 !important; }
    html.dark header { background-color: #1e293b !important; border-color: #334155 !important; }

    /* ── Purple / accent text — soft lavender, bukan putih ── */
    html.dark .text-\[\#4B164C\],
    html.dark [class*="text-[#4B164C]"],
    html.dark h1.text-\[\#4B164C\],
    html.dark h2.text-\[\#4B164C\],
    html.dark h3.text-\[\#4B164C\],
    html.dark .hist-avatar,
    html.dark .pv-meta-item .val.nomor {
        color: #f0abfc !important;
    }

    /* ── Sidebar: menu aktif ── */
    html.dark #sidebar nav a.bg-purple-50,
    html.dark #sidebar nav a.text-\[\#4B164C\] {
        background-color: rgba(221, 136, 207, 0.18) !important;
        color: #f0abfc !important;
    }
    html.dark #sidebar nav a.bg-purple-50 i,
    html.dark #sidebar nav a.bg-purple-50 span {
        color: #f0abfc !important;
    }

    /* ── Sidebar & tombol: hover/focus/klik — abu gelap, bukan putih ── */
    html.dark .hover\:bg-slate-100:hover,
    html.dark .hover\:bg-gray-50:hover {
        background-color: #334155 !important;
        color: #e2e8f0 !important;
    }
    html.dark #sidebar nav a:hover,
    html.dark #sidebar button:hover {
        background-color: #334155 !important;
        color: #e2e8f0 !important;
    }
    html.dark #sidebar nav a:hover i,
    html.dark #sidebar nav a:hover span,
    html.dark #sidebar button:hover i,
    html.dark #sidebar button:hover span {
        color: #e2e8f0 !important;
    }
    html.dark .hover\:bg-red-50:hover {
        background-color: rgba(239, 68, 68, 0.15) !important;
        color: #fca5a5 !important;
    }
    html.dark .text-slate-700 { color: #cbd5e1 !important; }

    /* ── Card ── */
    html.dark .card-shadow { box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
    html.dark .bg-white { background-color: #1e293b !important; border-color: #334155 !important; color: #e2e8f0 !important; }

    /* ── Icon badge card total surat ── */
    html.dark .bg-\[\#DD88CF\]\/20 {
        background-color: rgba(221, 136, 207, 0.2) !important;
        color: #f0abfc !important;
        border: 1px solid rgba(221, 136, 207, 0.35) !important;
    }
    html.dark .bg-\[\#DD88CF\]\/20 i { color: #f0abfc !important; }

    /* ── Tombol gradient ── */
    html.dark .btn-primary,
    html.dark a.btn-primary,
    html.dark .btn-gradient,
    html.dark button.bg-gradient-to-r,
    html.dark a.bg-gradient-to-r {
        background: linear-gradient(to right, #4B164C, #DD88CF) !important;
        background-image: linear-gradient(to right, #4B164C, #DD88CF) !important;
        color: #f8fafc !important;
        border: none !important;
        box-shadow: 0 4px 14px rgba(75, 22, 76, 0.35) !important;
    }
    html.dark .btn-primary:hover,
    html.dark a.btn-primary:hover,
    html.dark .btn-gradient:hover,
    html.dark button.bg-gradient-to-r:hover,
    html.dark a.bg-gradient-to-r:hover {
        opacity: 0.92 !important;
        color: #f8fafc !important;
    }
    html.dark .btn-primary:active,
    html.dark a.btn-primary:active,
    html.dark .btn-gradient:active,
    html.dark button.bg-gradient-to-r:active,
    html.dark a.bg-gradient-to-r:active {
        background: linear-gradient(to right, #3a1039, #c070b8) !important;
        color: #f8fafc !important;
    }

    /* ── Tabel & dividers ── */
    html.dark .transactions-table thead th,
    html.dark .transactions-table tbody tr,
    html.dark .transactions-table tbody td,
    html.dark .table-scroll-wrap,
    html.dark .table-toolbar,
    html.dark .divide-y > :not([hidden]) ~ :not([hidden]),
    html.dark .divide-\[\#f5f6f8\] > :not([hidden]) ~ :not([hidden]),
    html.dark .hist-row,
    html.dark .border-gray-100,
    html.dark .border-\[\#eaecf0\],
    html.dark .border-\[\#f1f3f6\],
    html.dark .border-\[\#f1f5f9\],
    html.dark .border-\[\#F1F5F9\] {
        border-color: #334155 !important;
    }
    html.dark .day-group + .day-group { border-top-color: #0f172a !important; }
    html.dark .stat-row + .stat-row { border-top-color: #334155 !important; }
    html.dark .bg-\[\#fafbfc\],
    html.dark .bg-\[\#FAF7FC\] { background-color: #0f172a !important; }
    html.dark .bg-\[\#f0dcf0\] { background-color: rgba(221, 136, 207, 0.15) !important; }
    html.dark .transactions-table tbody tr:hover { background: #334155 !important; }
    html.dark .transactions-table tbody td { color: #cbd5e1 !important; }
    html.dark .transactions-table thead th { color: #94a3b8 !important; background: #0f172a !important; }

    /* ── DataTables pagination ── */
    html.dark .dataTables_wrapper .dataTables_paginate .paginate_button {
        background: #1e293b !important;
        border-color: #334155 !important;
        color: #94a3b8 !important;
    }
    html.dark .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
        background: #334155 !important;
        border-color: #475569 !important;
        color: #e2e8f0 !important;
    }
    html.dark .dataTables_wrapper .dataTables_paginate .paginate_button.current,
    html.dark .dataTables_wrapper .dataTables_paginate .paginate_button.current:hover {
        background: linear-gradient(to right, #4B164C, #DD88CF) !important;
        border-color: transparent !important;
        color: #f8fafc !important;
    }
    html.dark .dataTables_wrapper .dataTables_info { color: #94a3b8 !important; }

    /* ── Filter pills ── */
    html.dark .filter-pills { border-color: #334155 !important; }
    html.dark .filter-pill { background: #1e293b !important; color: #94a3b8 !important; border-color: #334155 !important; }
    html.dark .filter-pill:hover { background: #334155 !important; color: #e2e8f0 !important; }
    html.dark .filter-pill.active {
        background: linear-gradient(to right, #4B164C, #DD88CF) !important;
        color: #f8fafc !important;
    }
    html.dark .filter-more-btn { background: #1e293b !important; color: #94a3b8 !important; }
    html.dark .filter-more-btn:hover { background: #334155 !important; color: #e2e8f0 !important; }
    html.dark .filter-more-btn.active {
        background: linear-gradient(to right, #4B164C, #DD88CF) !important;
        color: #f8fafc !important;
    }
    html.dark .filter-dropdown { background: #1e293b !important; border-color: #334155 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important; }
    html.dark .filter-dropdown button { color: #94a3b8 !important; }
    html.dark .filter-dropdown button:hover { background: #334155 !important; color: #e2e8f0 !important; }
    html.dark .filter-dropdown button.active { color: #f0abfc !important; }

    html.dark .bg-purple-50 {
        background-color: rgba(221, 136, 207, 0.15) !important;
        color: #f0abfc !important;
    }
    html.dark .border-purple-100 { border-color: #475569 !important; }

    /* ── Input & search ── */
    html.dark .search-input,
    html.dark input[type="text"],
    html.dark input[type="email"],
    html.dark input[type="password"],
    html.dark input[type="date"],
    html.dark input[type="search"],
    html.dark textarea,
    html.dark select {
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
    }
    html.dark .search-input:focus,
    html.dark input:focus,
    html.dark textarea:focus,
    html.dark select:focus,
    html.dark .form-input:focus {
        background-color: #1e293b !important;
        border-color: #DD88CF !important;
        color: #f1f5f9 !important;
        box-shadow: 0 0 0 3px rgba(221, 136, 207, 0.2) !important;
        outline: none !important;
    }
    html.dark .search-input::placeholder,
    html.dark input::placeholder,
    html.dark textarea::placeholder { color: #64748b !important; }

    /* ── Dashboard & Surat ── */
    html.dark .day-header { background: #1e293b !important; color: #e2e8f0 !important; }
    html.dark .hist-row:hover { background: #334155 !important; }
    html.dark .hist-date-icon { background: #0f172a !important; color: #94a3b8 !important; }
    html.dark .hist-avatar { background: rgba(221, 136, 207, 0.15) !important; color: #f0abfc !important; }
    html.dark .transactions-card { background: #1e293b !important; border-color: #334155 !important; }
    html.dark .table-toolbar { background: #1e293b !important; color: #cbd5e1 !important; }
    html.dark .table-header { background: #0f172a !important; }
    html.dark .table-row:hover { background: #334155 !important; }
    html.dark td, html.dark th { border-color: #334155 !important; }
    html.dark .table-pagination { background: #1e293b !important; color: #cbd5e1 !important; }
    html.dark .mob-card { background: #1e293b !important; border-color: #334155 !important; }
    html.dark .mob-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.3) !important; }
    html.dark .btn-edit { background: #0f172a !important; border-color: #334155 !important; color: #94a3b8 !important; }
    html.dark .btn-edit:hover { background: #334155 !important; color: #fbbf24 !important; border-color: #475569 !important; }

    /* ── Action buttons (surat) ── */
    html.dark .action-btn.view-btn { background: rgba(126,34,206,0.15) !important; color: #d8b4fe !important; border-color: rgba(126,34,206,0.3) !important; }
    html.dark .action-btn.view-btn:hover { background: #7e22ce !important; color: #f8fafc !important; }
    html.dark .action-btn.print-btn { background: rgba(2,132,199,0.15) !important; color: #7dd3fc !important; border-color: rgba(2,132,199,0.3) !important; }
    html.dark .action-btn.print-btn:hover { background: #0284c7 !important; color: #f8fafc !important; }
    html.dark .action-btn.edit-btn { background: rgba(217,119,6,0.15) !important; color: #fcd34d !important; border-color: rgba(217,119,6,0.3) !important; }
    html.dark .action-btn.edit-btn:hover { background: #d97706 !important; color: #f8fafc !important; }
    html.dark .action-btn.delete-btn { background: rgba(220,38,38,0.15) !important; color: #fca5a5 !important; border-color: rgba(220,38,38,0.3) !important; }
    html.dark .action-btn.delete-btn:hover { background: #dc2626 !important; color: #f8fafc !important; }

    /* ── Auth pages ── */
    html.dark .form-panel { background-color: #1e293b !important; }
    html.dark .form-input, html.dark textarea {
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
    }
    html.dark .logo-text, html.dark .welcome-heading { color: #f1f5f9 !important; }
    html.dark .form-label { color: #cbd5e1 !important; }
    html.dark .tab-switcher { background-color: #0f172a !important; }
    html.dark .tab-btn { color: #94a3b8 !important; }
    html.dark .tab-btn.active { color: #f0abfc !important; }
    html.dark .success-box, html.dark .error-box { background-color: #0f172a !important; border-color: #334155 !important; }
    html.dark .deco-desc { color: #cbd5e1 !important; }

    /* ── Profil: theme toggle & badge ── */
    html.dark #theme-toggle-btn { border-color: #334155 !important; color: #e2e8f0 !important; }
    html.dark #theme-toggle-btn:hover { background-color: #334155 !important; color: #e2e8f0 !important; }
    html.dark #theme-switch-bg { background-color: #475569 !important; }
    html.dark #theme-switch-knob { background-color: #e2e8f0 !important; }
    html.dark .bg-green-50 { background-color: rgba(34,197,94,0.12) !important; }
    html.dark .text-green-700 { color: #86efac !important; }

    /* ── Modal logout ── */
    html.dark .bg-white.w-full.max-w-sm { background-color: #1e293b !important; color: #e2e8f0 !important; }

    /* ── Logo swap ── */
    .logo-img-light { display: block; }
    .logo-img-dark { display: none; }
    html.dark .logo-img-light { display: none !important; }
    html.dark .logo-img-dark { display: block !important; }
</style>
