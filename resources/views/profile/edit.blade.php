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
        <div class="max-w-5xl mx-auto space-y-6">
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[#4B164C] to-[#DD88CF] flex items-center justify-center text-white font-bold text-xl">
                        {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                    </div>
                    <div>
                        <h1 class="text-lg font-bold text-gray-900">{{ auth()->user()->name }}</h1>
                        <p class="text-sm text-gray-500">{{ auth()->user()->email }}</p>
                    </div>
                </div>
            </div>

            @include('profile.partials.update-profile-information-form')
            @include('profile.partials.update-password-form')

            <div class="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                <h2 class="text-lg font-bold text-red-600 mb-4">Zona Bahaya</h2>
                @include('profile.partials.delete-user-form')
            </div>
        </div>
    </main>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>