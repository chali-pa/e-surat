<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tambah Surat - E-Surat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Poppins', sans-serif; background-color: #F9FAFB; }

        /* Sidebar Styling */
        #sidebar { transition: width 0.3s; width: 260px; position: fixed; height: 100vh; z-index: 100; background-color: #ffffff; border-right: 1px solid #e5e7eb; }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }
    </style>
</head>
<body>

    <!-- Sidebar Utama -->
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

    <!-- Main Content -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <!-- Header dengan Gradient -->
        <header class="bg-gradient-to-r from-[#4B164C] to-[#DD88CF] shadow-md p-5 flex justify-between items-center rounded-2xl mb-8 max-w-3xl mx-auto">
            <h2 class="text-xl font-bold text-white">Edit Surat</h2>
            <a href="{{ route('surat.index') }}" class="text-white hover:text-gray-200 transition flex items-center gap-2 font-medium">
                <i class="bi bi-arrow-left"></i> Kembali
            </a>
        </header>

        <div class="max-w-3xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
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
                        <input type="date" name="tanggal_masuk" value="{{ old('tanggal_masuk') }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal Buat</label>
                        <input type="date" name="tanggal_buat" value="{{ old('tanggal_buat') }}" required
                            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
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
                    <button type="submit" class="bg-[#4B164C] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#DD88CF] transition shadow-lg">
                        Simpan Surat
                    </button>
                </div>
            </form>
        </div>
    </main>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
    </script>

    @include('partials.logout-modal')
</body>
</html>
