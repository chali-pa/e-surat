<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Surat - E-Surat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <style>
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }
        .flatpickr-input.cursor-pointer { background-color: #fff; }

        /* Sidebar Styling */
        #sidebar { transition: width 0.3s; width: 260px; position: fixed; height: 100vh; z-index: 100; background-color: #ffffff; border-right: 1px solid #e5e7eb; }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

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
    <style>
        /* Dark Mode Overrides */
        .dark body { background-color: #0f172a !important; color: #f8fafc !important; }
        .dark #sidebar { background-color: #1e293b !important; border-color: #334155 !important; }
        .dark .bg-white { background-color: #1e293b !important; }
        .dark .bg-gray-50, .dark .bg-slate-50, .dark .bg-\[\#F4F6F9\], .dark .bg-\[\#F9FAFB\] { background-color: #0f172a !important; }
        .dark .text-gray-900, .dark .text-gray-800, .dark .text-\[\#1a1a2e\] { color: #f8fafc !important; }
        .dark .text-gray-600, .dark .text-gray-500, .dark .text-slate-500 { color: #94a3b8 !important; }
        .dark .border-gray-200, .dark .border-gray-100, .dark .border-slate-100, .dark .border-\[\#eaecf0\], .dark .border-\[\#e5e7eb\] { border-color: #334155 !important; }
        .dark header { background-color: #1e293b !important; border-color: #334155 !important; }
        
        /* Dashboard & Surat Specifics */
        .dark .card-shadow { box-shadow: 0 1px 8px rgba(0,0,0,0.5) !important; }
        .dark .day-header { background: #1e293b !important; color: #f8fafc !important; }
        .dark .day-group + .day-group { border-top-color: #0f172a !important; }
        .dark .hist-row:hover { background: #334155 !important; }
        .dark .hist-date-icon { background: #0f172a !important; color: #cbd5e1 !important; }
        .dark .transactions-card { background: #1e293b !important; border-color: #334155 !important; }
        .dark .table-toolbar { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        .dark .table-header { background: #0f172a !important; border-color: #334155 !important; }
        .dark .table-row:hover { background: #334155 !important; }
        .dark td, .dark th { border-color: #334155 !important; }
        .dark .table-pagination { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        .dark select { background-color: #0f172a !important; color: #f8fafc !important; border-color: #334155 !important; }
        
        /* Auth Specifics */
        .dark .form-panel { background-color: #1e293b !important; }
        .dark .form-input, .dark textarea { background-color: #0f172a !important; border-color: #334155 !important; color: #f8fafc !important; }
        .dark .form-input:focus, .dark textarea:focus { border-color: #DD88CF !important; }
        .dark .logo-text, .dark .welcome-heading { color: #f8fafc !important; }
        .dark .form-label { color: #cbd5e1 !important; }
        .dark .tab-switcher { background-color: #0f172a !important; }
        .dark .tab-btn { color: #94a3b8 !important; }
        .dark .tab-btn.active { color: #fff !important; }
        .dark .success-box, .dark .error-box { background-color: #0f172a !important; border-color: #334155 !important; }
        .dark .deco-desc { color: #cbd5e1 !important; }
    </style>
    <link rel="icon" type="image/svg+xml" href="{{ asset('image/favicon-esurat.svg') }}">
</head>
<body>

    <!-- Mobile Topbar -->
    <header class="lg:hidden sticky top-0 z-[80] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <button type="button" onclick="openMobileSidebar()" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
        <span class="font-bold text-[#4B164C] text-lg sm:text-xl md:text-2xl">E-Surat</span>
        <span class="w-9"></span>
    </header>
    <div id="sidebarOverlay" onclick="closeMobileSidebar()"></div>

    <!-- Sidebar Utama -->
    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4">
            <button id="toggleBtn" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
            <span class="ml-3 font-bold text-[#4B164C] text-lg sm:text-xl lg:text-2xl menu-text">E-Surat</span>
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

    <!-- Main Content -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <!-- Header dengan Gradient -->
        <header class="bg-gradient-to-r from-[#4B164C] to-[#DD88CF] shadow-md p-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center rounded-2xl mb-8 max-w-3xl mx-auto">
            <h2 class="text-xl font-bold text-white">Edit Surat</h2>
            <a href="{{ route('surat.index') }}" class="text-white hover:text-gray-200 transition flex items-center gap-2 font-medium">
                <i class="bi bi-arrow-left"></i> Kembali
            </a>
        </header>

        <div class="max-w-3xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-8">
            @if ($errors->any())
                <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
                    <ul class="list-disc pl-5">
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form action="{{ route('surat.update', $surat->id) }}" method="POST" enctype="multipart/form-data" class="space-y-6">
                @csrf
                @method('PUT')
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Nomor Surat</label>
                        <input type="text" name="nomor_surat" value="{{ old('nomor_surat', $surat->nomor_surat) }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Nama Pengirim</label>
                        <input type="text" name="nama_pengirim" value="{{ old('nama_pengirim', $surat->nama_pengirim) }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal Masuk</label>
                        <input type="text" id="tanggal_masuk" name="tanggal_masuk" value="{{ old('tanggal_masuk', \Carbon\Carbon::parse($surat->tanggal_masuk)->format('Y-m-d')) }}" required autocomplete="off" placeholder="Pilih tanggal"
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition cursor-pointer bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal Buat</label>
                        <input type="text" id="tanggal_buat" name="tanggal_buat" value="{{ old('tanggal_buat', \Carbon\Carbon::parse($surat->tanggal_buat)->format('Y-m-d')) }}" required autocomplete="off" placeholder="Pilih tanggal"
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition cursor-pointer bg-white">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Nama Surat</label>
                    <input type="text" name="nama_surat" value="{{ old('nama_surat', $surat->nama_surat) }}" required
                        class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        Upload File Surat <span class="font-normal text-gray-400">(kosongkan jika tidak ingin mengganti file)</span>
                    </label>
                    <p class="text-sm text-gray-500 mb-2">File saat ini: <span class="font-medium text-gray-700">{{ $surat->nama_file }}</span></p>
                    <input type="file" name="file_surat"
                        class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-[#F3E8F3] file:px-4 file:py-2 file:text-[#4B164C]">
                </div>

                <div class="flex justify-end pt-4">
                    <button type="submit" class="bg-[#4B164C] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#DD88CF] transition shadow-lg">
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/id.js"></script>
    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
        function openMobileSidebar() { document.body.classList.add('sidebar-mobile-open'); }
        function closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }
        document.querySelectorAll('#sidebar nav a').forEach(link => link.addEventListener('click', closeMobileSidebar));

        // Format tanggal: tanggal, bulan, lalu tahun (contoh: 16 Juli 2026)
        flatpickr.localize(flatpickr.l10ns.id);
        const datePickerOptions = {
            altInput: true,
            altFormat: "j F Y",
            dateFormat: "Y-m-d",
            locale: "id",
            disableMobile: true,
        };
        flatpickr("#tanggal_masuk", datePickerOptions);
        flatpickr("#tanggal_buat", datePickerOptions);
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>