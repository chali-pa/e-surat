<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard E-Surat</title>
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

        .card-shadow { box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    </style>
</head>
<body>

    <!-- Sidebar -->
    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4">
            <button id="toggleBtn" class="p-2 rounded-xl hover:bg-gray-100"><i class="bi bi-list text-2xl"></i></button>
            <span class="ml-3 font-bold text-[#4B164C] text-lg menu-text">E-Surat</span>
        </div>
        <nav class="flex-1 p-3 space-y-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C]">
                <i class="bi bi-grid-1x2-fill text-lg"></i><span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-envelope-fill text-lg"></i><span class="ml-4 menu-text">Kelola Surat</span>
            </a>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content min-h-screen p-4 md:p-8">
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800">Halaman Utama Dashboard</h1>
                <a href="{{ route('surat.create') }}" class="bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md hover:bg-indigo-800 transition">
                    <span class="mr-1">+</span> Tambah
                </a>
            </div>

            <!-- Statistik Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <!-- Total Surat Masuk -->
                <div class="bg-indigo-700 p-4 rounded-xl text-white flex justify-between items-center">
                    <div>
                        <p class="text-sm opacity-90">Total Surat Masuk</p>
                        <p class="text-3xl font-bold">285</p>
                    </div>
                    <div class="text-3xl opacity-80">✉️</div>
                </div>
                <!-- Surat Belum Direspon -->
                <div class="bg-white p-4 rounded-xl border border-gray-200 card-shadow">
                    <p class="text-sm text-gray-500 mb-1">Surat Belum Direspon</p>
                    <div class="flex justify-between items-center">
                        <p class="text-3xl font-bold text-gray-800">1</p>
                        <span class="text-2xl text-orange-500">⚠️</span>
                    </div>
                </div>
                <!-- Surat Dalam Proses -->
                <div class="bg-white p-4 rounded-xl border border-gray-200 card-shadow">
                    <p class="text-sm text-gray-500 mb-1">Surat Dalam Proses</p>
                    <div class="flex justify-between items-center">
                        <p class="text-3xl font-bold text-gray-800">1</p>
                        <span class="text-2xl text-indigo-700">⚙️</span>
                    </div>
                </div>
                <!-- Surat Selesai -->
                <div class="bg-white p-4 rounded-xl border border-gray-200 card-shadow">
                    <p class="text-sm text-gray-500 mb-1">Surat Selesai</p>
                    <div class="flex justify-between items-center">
                        <p class="text-3xl font-bold text-gray-800">283</p>
                        <span class="text-2xl text-green-600">✅</span>
                    </div>
                </div>
            </div>

            <!-- Tabel Surat Terbaru -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 card-shadow">
                <h2 class="text-lg font-bold text-gray-800 mb-4">5 Surat Terbaru (Hingga 06 Juli 2026)</h2>
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-gray-600 text-sm border-b border-gray-100">
                            <th class="pb-3 font-semibold">No</th>
                            <th class="pb-3 font-semibold">Nomor Surat</th>
                            <th class="pb-3 font-semibold">Pengirim</th>
                            <th class="pb-3 font-semibold">Tgl Masuk</th>
                            <th class="pb-3 font-semibold">Status</th>
                            <th class="pb-3 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm text-gray-700">
                        <tr class="border-b border-gray-50">
                            <td class="py-3">1</td>
                            <td>111234</td>
                            <td>Figo</td>
                            <td>06/07/2026</td>
                            <td><span class="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">Dalam Proses</span></td>
                            <td class="text-indigo-700 underline cursor-pointer">View Icon</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3">2</td>
                            <td>hai</td>
                            <td>Hafidh</td>
                            <td>04/07/2026</td>
                            <td><span class="bg-orange-600 text-white px-3 py-1 rounded-full text-xs">Belum Direspon</span></td>
                            <td class="text-indigo-700 underline cursor-pointer">View Icon</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3">3</td>
                            <td>E-1003</td>
                            <td>Yuna</td>
                            <td>03/07/2026</td>
                            <td><span class="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Selesai</span></td>
                            <td class="text-indigo-700 underline cursor-pointer">View Icon</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3">4</td>
                            <td>1</td>
                            <td>Chalipa</td>
                            <td>01/07/2026</td>
                            <td><span class="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Selesai</span></td>
                            <td class="text-indigo-700 underline cursor-pointer">View Icon</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3">5</td>
                            <td>2221134</td>
                            <td>Zafiraa</td>
                            <td>29/06/2026</td>
                            <td><span class="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Selesai</span></td>
                            <td class="text-indigo-700 underline cursor-pointer">View Icon</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
    </script>
</body>
</html>

