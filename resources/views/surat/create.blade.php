<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tambah Surat - E-Surat</title>
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
        body.sidebar-collapsed .menu-text { opacity: 0; display: none !important; }
        body.sidebar-collapsed #sidebar nav a { justify-content: center; padding-left: 0 !important; padding-right: 0 !important; }
        body.sidebar-collapsed #sidebar .sidebar-logo { display: none !important; }
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

    <!-- Sidebar Utama -->
    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4 border-b border-gray-100">
            <button id="toggleBtn" class="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"><i class="bi bi-list text-2xl"></i></button>
            <a href="{{ route('dashboard') }}" class="ml-3 flex items-center sidebar-logo">
                <img src="{{ asset('image/logo-esurat-light.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-light">
                <img src="{{ asset('image/logo-esurat-dark.svg') }}" alt="E-Surat" class="h-11 sm:h-12 w-auto logo-img-dark">
            </a>
        </div>
        <nav class="flex-1 p-3 space-y-2 mt-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
                <i class="bi bi-grid-1x2-fill text-lg"></i><span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C] font-medium">
                <i class="bi bi-envelope-fill text-lg"></i><span class="ml-4 menu-text">Kelola Surat</span>
            </a>
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
                <i class="bi bi-person-fill text-lg"></i><span class="ml-4 menu-text">Profil</span>
            </a>
            <div class="mt-4 border-t border-gray-100 pt-4">
                <button type="button" onclick="openLogoutModal()" class="w-full flex items-center p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
                    <i class="bi bi-box-arrow-right text-lg"></i><span class="ml-4 menu-text">Keluar</span>
                </button>
            </div>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <!-- Header dengan Gradient -->
        <header class="bg-gradient-to-r from-[#4B164C] to-[#DD88CF] shadow-md p-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center rounded-2xl mb-8 max-w-3xl mx-auto">
            <h2 class="text-xl font-bold text-white">Tambah Surat Baru</h2>
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

            <form action="{{ route('surat.store') }}" method="POST" enctype="multipart/form-data" class="space-y-6">
                @csrf
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Nomor Surat</label>
                        <input type="text" name="nomor_surat" value="{{ old('nomor_surat') }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Nama Pengirim</label>
                        <input type="text" name="nama_pengirim" value="{{ old('nama_pengirim') }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal Masuk</label>
                        <input type="text" id="tanggal_masuk" name="tanggal_masuk" value="{{ old('tanggal_masuk') }}" required autocomplete="off" placeholder="Pilih tanggal"
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition cursor-pointer bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal Buat</label>
                        <input type="text" id="tanggal_buat" name="tanggal_buat" value="{{ old('tanggal_buat') }}" required autocomplete="off" placeholder="Pilih tanggal"
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition cursor-pointer bg-white">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Nama Surat</label>
                    <input type="text" name="nama_surat" value="{{ old('nama_surat') }}" required
                        class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Upload File Surat</label>
                    <input type="file" name="file_surat" required
                        class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-[#F3E8F3] file:px-4 file:py-2 file:text-[#4B164C]">
                </div>

                <div class="flex justify-end pt-4">
                    <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white font-semibold rounded-xl hover:opacity-90 transition shadow-md">
                        Simpan Surat
                    </button>
                </div>
            </form>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/id.js"></script>
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
    @include('partials.security')
</body>
</html>