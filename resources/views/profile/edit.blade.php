<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profil</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }
        #sidebar { transition: width 0.3s; width: 260px; position: fixed; height: 100vh; z-index: 100; background-color: #ffffff; border-right: 1px solid #e5e7eb; }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

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

        .profile-banner {
            background: linear-gradient(120deg, #4B164C 0%, #7A2A6E 45%, #DD88CF 100%);
        }
        .avatar-ring {
            box-shadow: 0 0 0 4px #ffffff, 0 8px 20px -6px rgba(75, 22, 76, 0.35);
        }
        .stat-row + .stat-row {
            border-top: 1px solid #F1F1F4;
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

    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4">
            <button id="toggleBtn" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
            <span class="ml-3 font-bold text-[#4B164C] text-lg menu-text">E-Surat</span>
        </div>
        <nav class="flex-1 p-3 space-y-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-grid-1x2-fill text-lg"></i><span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-envelope-fill text-lg"></i><span class="ml-4 menu-text">Kelola Surat</span>
            </a>
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C] transition">
                <i class="bi bi-person-fill text-lg"></i><span class="ml-4 menu-text">Profil</span>
            </a>
            <button type="button" onclick="openLogoutModal()" class="w-full flex items-center p-3 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-600 transition mt-4 border-t border-gray-100 pt-4">
                <i class="bi bi-box-arrow-right text-lg"></i><span class="ml-4 menu-text">Keluar</span>
            </button>
        </nav>
    </aside>

    <main class="main-content min-h-screen p-4 md:p-8">
        <div class="max-w-6xl mx-auto space-y-6">

            <div>
                <h1 class="text-2xl font-bold text-gray-900">Profil Saya</h1>
                <p class="text-sm text-gray-500 mt-1">Kelola informasi akun, keamanan, dan preferensi Anda di sini.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                <div class="lg:col-span-1 lg:sticky lg:top-8">
                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div class="h-8 sm:h-10 profile-banner relative">
                            <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 30%, #fff 0, transparent 35%);"></div>
                        </div>
                        {{-- flow-root prevents the avatar's negative margin from collapsing into this container --}}
                        <div class="px-5 sm:px-6 pb-6 flow-root">
                            <div class="mt-2 mb-5 inline-block">
                                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#4B164C] to-[#DD88CF] flex items-center justify-center text-white font-bold text-2xl sm:text-3xl avatar-ring">
                                    {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                                </div>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900 leading-tight break-words">{{ auth()->user()->name }}</h2>
                            <p class="text-sm text-gray-500 break-all">{{ auth()->user()->email }}</p>

                            <div class="flex flex-wrap items-center gap-2 mt-3">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                    <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Akun Aktif
                                </span>
                                @if(auth()->user()->email_verified_at)
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-[#4B164C] text-xs font-medium">
                                        <i class="bi bi-patch-check-fill"></i> Terverifikasi
                                    </span>
                                @endif
                            </div>

                            <div class="mt-6 pt-5 border-t border-gray-100 text-sm">
                                <div class="stat-row flex items-center justify-between py-2.5 gap-3">
                                    <span class="text-gray-500 flex items-center gap-2 shrink-0"><i class="bi bi-calendar3 text-gray-400"></i> Bergabung</span>
                                    <span class="font-medium text-gray-700 text-right">{{ optional(auth()->user()->created_at)->format('d M Y') ?? '-' }}</span>
                                </div>
                                <div class="stat-row flex items-center justify-between py-2.5 gap-3">
                                    <span class="text-gray-500 flex items-center gap-2 shrink-0"><i class="bi bi-shield-lock text-gray-400"></i> Keamanan</span>
                                    <span class="font-medium text-gray-700 text-right">Password aktif</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-2 space-y-6">
                    @include('profile.partials.update-profile-information-form')
                    @include('profile.partials.update-password-form')

                    <div class="bg-white p-6 md:p-8 rounded-2xl border border-red-100 shadow-sm">
                        <h2 class="text-lg font-bold text-red-600 mb-1 flex items-center gap-2">
                            <i class="bi bi-exclamation-triangle-fill"></i> Zona Bahaya
                        </h2>
                        <p class="text-sm text-gray-500 mb-5">Tindakan berikut bersifat permanen dan tidak dapat dibatalkan.</p>
                        @include('profile.partials.delete-user-form')
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
        function openMobileSidebar() { document.body.classList.add('sidebar-mobile-open'); }
        function closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }
        document.querySelectorAll('#sidebar nav a').forEach(link => link.addEventListener('click', closeMobileSidebar));
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>