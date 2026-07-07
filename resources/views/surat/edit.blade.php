<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Surat - Manajemen Surat</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#FFFFFF] text-gray-800 font-sans flex h-screen overflow-hidden">

    <aside class="w-64 bg-gradient-to-b from-[#4B164C] to-[#DD88CF] text-white flex flex-col shadow-lg">
        <div class="p-6 text-center border-b border-white/20">
            <h1 class="text-2xl font-bold tracking-wider">E-Surat</h1>
        </div>
        <nav class="flex-1 p-4 space-y-2">
            <a href="{{ route('dashboard') }}" class="block p-3 rounded bg-white/20 hover:bg-white/30 transition">Dashboard</a>
            <a href="{{ route('surat.index') }}" class="block p-3 rounded hover:bg-white/20 transition">Kelola Surat</a>
        </nav>
    </aside>

    <main class="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <header class="bg-white shadow-sm p-4 flex justify-between items-center">
            <h2 class="text-xl font-semibold text-[#4B164C]">Edit Surat</h2>
            <a href="{{ route('surat.index') }}" class="text-gray-500 hover:text-gray-700 transition flex items-center gap-2">
                &larr; Kembali
            </a>
        </header>

        <div class="p-6 flex-1 flex justify-center items-start">
            <div class="bg-white border rounded-lg shadow-sm p-8 w-full max-w-2xl mt-4">

                @if ($errors->any())
                    <div class="bg-red-50 text-red-500 p-4 rounded-md mb-6 border border-red-200">
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

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="nomor_surat" class="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
                            <input type="text" id="nomor_surat" name="nomor_surat"
                                value="{{ old('nomor_surat', $surat->nomor_surat) }}" required
                                class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                        </div>

                        <div>
                            <label for="nama_pengirim" class="block text-sm font-medium text-gray-700 mb-1">Nama Pengirim</label>
                            <input type="text" id="nama_pengirim" name="nama_pengirim"
                                value="{{ old('nama_pengirim', $surat->nama_pengirim) }}" required
                                class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="tanggal_masuk" class="block text-sm font-medium text-gray-700 mb-1">Tanggal Masuk Surat</label>
                            <input type="date" id="tanggal_masuk" name="tanggal_masuk"
                                value="{{ old('tanggal_masuk', $surat->tanggal_masuk) }}" required
                                class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                        </div>

                        <div>
                            <label for="tanggal_buat" class="block text-sm font-medium text-gray-700 mb-1">Tanggal Buat Surat</label>
                            <input type="date" id="tanggal_buat" name="tanggal_buat"
                                value="{{ old('tanggal_buat', $surat->tanggal_buat) }}" required
                                class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                        </div>
                    </div>

                    <div>
                        <label for="nama_surat" class="block text-sm font-medium text-gray-700 mb-1">Nama Surat</label>
                        <input type="text" id="nama_surat" name="nama_surat"
                            value="{{ old('nama_surat', $surat->nama_surat) }}" required
                            placeholder="Contoh: Surat Undangan Rapat"
                            class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                    </div>

                    <div>
                        <label for="file_surat" class="block text-sm font-medium text-gray-700 mb-1">
                            Ganti File Surat <span class="text-gray-400 font-normal">(opsional)</span>
                        </label>

                        {{-- Info file saat ini --}}
                        <div class="flex items-center gap-2 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <svg class="w-4 h-4 text-[#4B164C] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                            </svg>
                            <span class="text-sm text-gray-600">File saat ini:</span>
                            <a href="{{ asset('storage/' . $surat->file_path) }}" target="_blank"
                               class="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium truncate">
                                {{ $surat->nama_file }}
                            </a>
                        </div>

                        <input type="file" id="file_surat" name="file_surat"
                            class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition">
                        <p class="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengganti file. Maksimal: 100MB.</p>
                    </div>

                    <div class="flex justify-end gap-3 pt-4">
                        <a href="{{ route('surat.index') }}"
                           class="px-6 py-2.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium transition">
                            Batal
                        </a>
                        <button type="submit"
                            class="bg-[#4B164C] hover:bg-[#DD88CF] text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition">
                            Simpan Perubahan
                        </button>
                    </div>
                </form>

            </div>
        </div>
    </main>

</body>
</html>
