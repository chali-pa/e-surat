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
        body { font-family: 'Poppins', sans-serif; background-color: #F4F6F9; }

        /* ── Sidebar ── */
        #sidebar {
            transition: width 0.3s;
            width: 260px;
            position: fixed;
            height: 100vh;
            z-index: 100;
            background: #fff;
            border-right: 1px solid #eaecf0;
            box-shadow: 1px 0 12px rgba(0,0,0,0.03);
        }
        body.sidebar-collapsed #sidebar { width: 72px !important; }
        body.sidebar-collapsed .menu-text { opacity: 0; display: none; }
        .main-content { margin-left: 260px; transition: margin-left 0.3s; }
        body.sidebar-collapsed .main-content { margin-left: 72px; }

        /* ── Card shadow ── */
        .card-shadow { box-shadow: 0 1px 8px rgba(0,0,0,0.06); }

        /* ── Primary button ── */
        .btn-primary {
            background: #4B164C; color: #fff;
            transition: background 200ms ease;
        }
        .btn-primary:hover { background: #3e123c; }

        /* ── History row ── */
        .hist-row {
            display: flex;
            align-items: center;
            gap: 1.1rem;
            padding: 1.05rem 1.5rem;
            transition: background 150ms ease;
            cursor: pointer;
        }
        .hist-row:hover { background: #faf7fb; }

        /* avatar inisial */
        .hist-avatar {
            width: 42px; height: 42px; border-radius: 50%;
            background: #f3eaf4;
            color: #4B164C;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.85rem; font-weight: 600;
            flex-shrink: 0;
        }

        /* day group header (ala Chrome history) */
        .day-group + .day-group { border-top: 8px solid #F4F6F9; }
        .day-header {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.9rem 1.5rem;
            background: #faf5fb;
        }
        .day-header .day-icon {
            width: 28px; height: 28px; border-radius: 8px;
            background: #f0dcf0;
            color: #4B164C;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        /* icon kalender */
        .hist-date-icon {
            width: 34px; height: 34px; border-radius: 10px;
            background: #f8f9fb;
            color: #94a3b8;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.85rem;
            flex-shrink: 0;
        }

        /* jam pill */
        .hist-time {
            display: inline-flex; align-items: center; gap: 0.35rem;
            font-size: 12.5px; font-weight: 500; color: #94a3b8;
            font-variant-numeric: tabular-nums;
            /* width: 16px; (Dihapus untuk responsivitas) */
        }

        /* col widths */
        .hist-col-main  { flex: 0 0 30%; min-width: 0; }
        .hist-col-date  { flex: 0 0 16%; min-width: 0; }
        .hist-col-sender{ flex: 0 0 20%; min-width: 0; }
        .hist-col-no    { flex: 0 0 8%;  min-width: 0; }
        .hist-col-act   { flex: 0 0 6%;  min-width: 0; text-align: right; }

        /* edit btn */
        .btn-edit {
            display: inline-flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 10px;
            background: #fafafa; border: 1px solid #e8eaed;
            color: #94a3b8;
            transition: background 150ms, color 150ms;
            text-decoration: none;
        }
        .btn-edit:hover { background: #fff8eb; color: #b45309; border-color: #fde68a; }

        /* Responsive */
        #sidebarOverlay { display: none; }
        @media (max-width: 767px) {
            #sidebar, body.sidebar-collapsed #sidebar {
                width: 260px !important; transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            body.sidebar-mobile-open #sidebar { transform: translateX(0); }
            body.sidebar-collapsed .menu-text { opacity: 1 !important; display: inline !important; }
            .main-content { margin-left: 0 !important; }
            body.sidebar-mobile-open #sidebarOverlay {
                display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 90;
            }
        }

        /* ── Mobile card ── */
        .mob-card {
            background: #fff; border: 1px solid #eaecf0; border-radius: 16px;
            overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            transition: box-shadow 150ms;
        }
        .mob-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
    </style>
</head>
<body>

    <header class="md:hidden sticky top-0 z-[80] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
        <button type="button" onclick="openMobileSidebar()" class="p-2 rounded-xl text-slate-700 hover:bg-slate-100"><i class="bi bi-list text-2xl"></i></button>
        <span class="font-bold text-[#4B164C] text-lg">E-Surat</span>
        <span class="w-9"></span>
    </header>
    <div id="sidebarOverlay" onclick="closeMobileSidebar()"></div>

    <aside id="sidebar" class="shadow-sm">
        <div class="h-[76px] flex items-center px-4 border-b border-gray-100">
            <button id="toggleBtn" class="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"><i class="bi bi-list text-2xl"></i></button>
            <span class="ml-3 font-bold text-[#4B164C] text-xl menu-text">E-Surat</span>
        </div>
        <nav class="flex-1 p-3 space-y-2 mt-2">
            <a href="{{ route('dashboard') }}" class="flex items-center p-3 rounded-xl bg-purple-50 text-[#4B164C] font-medium">
                <i class="bi bi-grid-1x2-fill text-lg"></i><span class="ml-4 menu-text">Dashboard</span>
            </a>
            <a href="{{ route('surat.index') }}" class="flex items-center p-3 rounded-xl text-slate-600 hover:bg-slate-100 transition">
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

    <main class="main-content min-h-screen p-4 md:p-8">
        <div class="max-w-7xl mx-auto space-y-8">
            <section class="space-y-8">

                <!-- Title + Single Total Card -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h1 class="text-3xl font-bold text-[#4B164C]">Halaman Utama</h1>
                        <p class="mt-1 text-slate-500">Selamat datang kembali! Berikut sekilas tentang total surat masuk.</p>
                    </div>
                    <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        <!-- Tombol Tambah Surat -->
                        <a href="{{ route('surat.create') }}"
                            class="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold shadow-sm hover:shadow-md transition whitespace-nowrap">
                            <i class="bi bi-plus-lg text-lg"></i> Tambah Surat
                        </a>
                        <!-- Single prominent card -->
                        <div class="bg-white p-6 rounded-3xl card-shadow border border-gray-100 flex items-center gap-5 w-full sm:w-auto">
                            <div class="p-4 rounded-2xl bg-[#DD88CF]/20 text-[#4B164C] flex-shrink-0">
                                <i class="bi bi-envelope-paper-fill text-2xl"></i>
                            </div>
                            <div>
                                <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Surat Masuk</span>
                                <p class="mt-1 text-4xl font-bold text-slate-900">{{ $surats->count() }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── Riwayat Surat (Histories Style) ── -->
                <div class="bg-white rounded-3xl card-shadow border border-[#eaecf0] overflow-hidden">

                    <!-- Header card -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-[#f1f3f6]">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800 tracking-tight">Riwayat Surat</h2>
                            <p class="text-[13px] font-light text-slate-400 mt-0.5">Semua surat masuk tercatat di sini</p>
                        </div>
                        <div class="relative w-full sm:w-64">
                            <i class="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input id="searchInput" type="text" placeholder="Cari nama atau pengirim…"
                                class="w-full rounded-xl border border-[#eaecf0] bg-[#f8f9fb] pl-9 pr-4 py-2.5 text-[13px] font-light text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#c084cf] focus:ring-2 focus:ring-[#DD88CF]/15" />
                        </div>
                    </div>

                    @php
                        $grouped = $surats->groupBy(function ($s) {
                            return $s->created_at->format('Y-m-d');
                        });
                    @endphp

                    <!-- ── Desktop: column header ── -->
                    <div class="hidden md:flex items-center gap-[1.1rem] px-[1.5rem] py-3 bg-[#fafbfc] border-b border-[#f1f3f6] text-[11.5px] font-semibold text-slate-400 uppercase tracking-widest select-none">
                        <div class="w-16 flex-shrink-0">Jam</div>
                        <div class="flex-1">Nama Surat</div>
                        <div class="w-40">Tgl Masuk</div>
                        <div class="w-8"></div>
                    </div>

                    <!-- ── Desktop: rows grouped by day ── -->
                    <div id="tableBody" class="hidden md:block">
                        @forelse($grouped as $dateKey => $suratsOnDay)
                            @php
                                $groupDate = \Carbon\Carbon::parse($dateKey);
                                if ($groupDate->isToday()) {
                                    $dayLabel = 'Hari Ini';
                                } elseif ($groupDate->isYesterday()) {
                                    $dayLabel = 'Kemarin';
                                } else {
                                    $dayLabel = $groupDate->translatedFormat('l, d F Y');
                                }
                            @endphp
                            <div class="day-group" data-day-group>
                                <div class="day-header sticky top-0 z-[5]">
                                    <div class="day-icon"><i class="bi bi-calendar-event"></i></div>
                                    <span class="text-[13.5px] font-semibold text-slate-700">{{ $dayLabel }}</span>
                                    <span class="text-[11.5px] font-light text-slate-400">{{ $groupDate->translatedFormat('d F Y') }}</span>
                                    <span class="ml-auto text-[11px] font-medium text-[#4B164C] bg-[#f0dcf0] px-2.5 py-1 rounded-full">{{ $suratsOnDay->count() }} surat</span>
                                </div>
                                <div class="divide-y divide-[#f5f6f8]">
                                    @foreach($suratsOnDay as $surat)
                                    <div class="hist-row surat-row group"
                                         data-action="view"
                                         data-nosurat="{{ strtolower($surat->nomor_surat) }}"
                                         data-pengirim="{{ strtolower($surat->nama_pengirim) }}"
                                         data-status="{{ $surat->status }}"
                                         data-tanggalbuat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->translatedFormat('d M Y') }}"
                                         data-tanggalmasuk="{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->translatedFormat('d M Y') }}"
                                         data-namasurat="{{ $surat->nama_surat }}"
                                         data-fileurl="{{ route('surat.preview', $surat->id) }}"
                                         data-filename="{{ $surat->nama_file }}">

                                        <!-- Jam -->
                                        <div class="w-16 flex-shrink-0 hist-time">
                                            <i class="bi bi-clock"></i> {{ $surat->created_at->setTimezone('Asia/Jakarta')->format('H:i') }}
                                        </div>

                                        <!-- Nama Surat + No + Pengirim -->
                                        <div class="flex-1 flex items-center gap-3 min-w-0">
                                            <div class="hist-avatar">{{ strtoupper(substr($surat->nama_surat, 0, 1)) }}</div>
                                            <div class="min-w-0">
                                                <p class="text-[14px] font-medium text-slate-700 truncate leading-snug" title="{{ $surat->nama_surat }}">{{ $surat->nama_surat }}</p>
                                                <p class="text-[12.5px] font-light text-slate-400 truncate mt-1">{{ $surat->nomor_surat }} &middot; {{ $surat->nama_pengirim }}</p>
                                            </div>
                                        </div>

                                        <!-- Tgl Masuk -->
                                        <div class="w-40 flex items-center gap-2.5">
                                            <div class="hist-date-icon"><i class="bi bi-box-arrow-in-down"></i></div>
                                            <span class="text-[12.5px] font-light text-slate-500">{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->translatedFormat('d M Y') }}</span>
                                        </div>

                                        <!-- Edit btn -->
                                        <div class="w-8 flex justify-end flex-shrink-0">
                                            <a href="{{ route('surat.edit', $surat->id) }}"
                                               class="btn-edit opacity-0 group-hover:opacity-100 transition-opacity"
                                               title="Edit" onclick="event.stopPropagation()">
                                                <i class="bi bi-pencil text-[13px]"></i>
                                            </a>
                                        </div>
                                    </div>
                                    @endforeach
                                </div>
                            </div>
                        @empty
                        <div class="flex flex-col items-center gap-3 py-16">
                            <div class="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <i class="bi bi-inbox text-2xl text-slate-300"></i>
                            </div>
                            <p class="text-[13px] font-light text-slate-400">Belum ada riwayat surat.</p>
                        </div>
                        @endforelse
                    </div>

                    <!-- ── Mobile: cards grouped by day ── -->
                    <div id="mobileCards" class="md:hidden">
                        @forelse($grouped as $dateKey => $suratsOnDay)
                            @php
                                $groupDate = \Carbon\Carbon::parse($dateKey);
                                if ($groupDate->isToday()) {
                                    $dayLabel = 'Hari Ini';
                                } elseif ($groupDate->isYesterday()) {
                                    $dayLabel = 'Kemarin';
                                } else {
                                    $dayLabel = $groupDate->translatedFormat('l, d F Y');
                                }
                            @endphp
                            <div class="day-group" data-day-group>
                                <div class="day-header sticky top-0 z-[5]">
                                    <div class="day-icon"><i class="bi bi-calendar-event"></i></div>
                                    <span class="text-[13px] font-semibold text-slate-700">{{ $dayLabel }}</span>
                                    <span class="ml-auto text-[11px] font-medium text-[#4B164C] bg-[#f0dcf0] px-2.5 py-1 rounded-full">{{ $suratsOnDay->count() }} surat</span>
                                </div>
                                <div class="divide-y divide-[#f5f6f8]">
                                    @foreach($suratsOnDay as $surat)
                                    <div class="surat-card px-5 py-4 hover:bg-[#fafbfc] transition"
                                         data-nosurat="{{ strtolower($surat->nomor_surat) }}"
                                         data-pengirim="{{ strtolower($surat->nama_pengirim) }}"
                                         data-status="{{ $surat->status }}">
                                        <!-- top row -->
                                        <div class="flex items-start gap-3">
                                            <div class="hist-avatar mt-0.5">{{ strtoupper(substr($surat->nama_surat, 0, 1)) }}</div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-[14px] font-medium text-slate-700 truncate">{{ $surat->nama_surat }}</p>
                                                <p class="text-[12px] font-light text-slate-400 mt-1">{{ $surat->nomor_surat }}</p>
                                            </div>
                                            <span class="hist-time flex-shrink-0 mt-1"><i class="bi bi-clock"></i> {{ $surat->created_at->setTimezone('Asia/Jakarta')->format('H:i') }}</span>
                                        </div>
                                        <!-- meta row -->
                                        <div class="mt-3 grid grid-cols-2 gap-y-2 text-[12px]">
                                            <div>
                                                <span class="text-slate-400 font-light block">Pengirim</span>
                                                <span class="text-slate-600 font-medium">{{ $surat->nama_pengirim }}</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-400 font-light block">Tgl Masuk</span>
                                                <span class="text-slate-600 font-medium">{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->translatedFormat('d M Y') }}</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-400 font-light block">Tgl Buat</span>
                                                <span class="text-slate-600 font-medium">{{ \Carbon\Carbon::parse($surat->tanggal_buat)->translatedFormat('d M Y') }}</span>
                                            </div>
                                        </div>
                                        <!-- actions -->
                                        <div class="mt-3 flex gap-2">
                                            <button type="button"
                                                data-action="view"
                                                data-nosurat="{{ $surat->nomor_surat }}"
                                                data-tanggalbuat="{{ \Carbon\Carbon::parse($surat->tanggal_buat)->translatedFormat('d M Y') }}"
                                                data-tanggalmasuk="{{ \Carbon\Carbon::parse($surat->tanggal_masuk)->translatedFormat('d M Y') }}"
                                                data-pengirim="{{ $surat->nama_pengirim }}"
                                                data-namasurat="{{ $surat->nama_surat }}"
                                                data-status="{{ $surat->status }}"
                                                data-fileurl="{{ route('surat.preview', $surat->id) }}"
                                                data-filename="{{ $surat->nama_file }}"
                                                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium bg-[#f0f5ff] text-[#3b63d8] hover:bg-[#e5eeff] transition">
                                                <i class="bi bi-eye"></i> Detail
                                            </button>
                                            <a href="{{ route('surat.edit', $surat->id) }}"
                                                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7] transition">
                                                <i class="bi bi-pencil"></i> Edit
                                            </a>
                                        </div>
                                    </div>
                                    @endforeach
                                </div>
                            </div>
                        @empty
                        <div class="flex flex-col items-center gap-3 py-14">
                            <div class="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <i class="bi bi-inbox text-2xl text-slate-300"></i>
                            </div>
                            <p class="text-[13px] font-light text-slate-400">Belum ada data surat.</p>
                        </div>
                        @endforelse
                    </div>

                    <!-- No results -->
                    <div id="noResults" class="hidden flex flex-col items-center gap-3 py-14">
                        <i class="bi bi-search text-2xl text-slate-300"></i>
                        <p class="text-[13px] font-light text-slate-400">Tidak ada surat yang cocok.</p>
                    </div>

            </section>
        </div>
    </main>

    <!-- Modal for Viewing Letter Details -->
    <div id="viewModalOverlay" class="fixed inset-0 z-[110] hidden items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-0 p-4">
        <div id="viewModalContainer" class="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-10 shadow-2xl transition-all duration-300 scale-95 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl md:text-2xl font-semibold text-[#4B164C]">Detail Surat Masuk</h3>
                <button type="button" id="closeViewModalBtn" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                    <i class="bi bi-x-lg text-lg"></i>
                </button>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">No Surat</label>
                    <p id="viewNoSurat" class="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"></p>
                </div>
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Tanggal Buat</label>
                    <p id="viewTanggalBuat" class="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"></p>
                </div>
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Tanggal Masuk</label>
                    <p id="viewTanggalMasuk" class="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"></p>
                </div>
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Pengirim</label>
                    <p id="viewPengirim" class="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"></p>
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Nama Surat / Perihal</label>
                    <p id="viewNamaSurat" class="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"></p>
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-xs font-medium text-slate-500 mb-1.5 ml-1">File Surat</label>
                    <a id="viewFileLink" href="#" target="_blank" rel="noopener"
                       class="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 hover:bg-[#F3E8F3] hover:border-[#DD88CF] transition group">
                        <span class="flex items-center gap-2 min-w-0">
                            <i class="bi bi-file-earmark-text text-lg text-[#4B164C] flex-shrink-0"></i>
                            <span id="viewFileName" class="truncate"></span>
                        </span>
                        <span class="flex items-center gap-1 text-[#4B164C] font-semibold text-xs flex-shrink-0">
                            Lihat File <i class="bi bi-box-arrow-up-right"></i>
                        </span>
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
        function openMobileSidebar() { document.body.classList.add('sidebar-mobile-open'); }
        function closeMobileSidebar() { document.body.classList.remove('sidebar-mobile-open'); }
        document.querySelectorAll('#sidebar nav a').forEach(link => link.addEventListener('click', closeMobileSidebar));

        const viewModalOverlay   = document.getElementById('viewModalOverlay');
        const viewModalContainer = document.getElementById('viewModalContainer');
        const closeViewModalBtn  = document.getElementById('closeViewModalBtn');

        function openViewModal(btn) {
            document.getElementById('viewNoSurat').textContent      = btn.dataset.nosurat;
            document.getElementById('viewTanggalBuat').textContent  = btn.dataset.tanggalbuat;
            document.getElementById('viewTanggalMasuk').textContent = btn.dataset.tanggalmasuk;
            document.getElementById('viewPengirim').textContent     = btn.dataset.pengirim;
            document.getElementById('viewNamaSurat').textContent    = btn.dataset.namasurat;
            document.getElementById('viewFileLink').href            = btn.dataset.fileurl;
            document.getElementById('viewFileName').textContent     = btn.dataset.filename;
            viewModalOverlay.classList.remove('hidden');
            viewModalOverlay.classList.add('flex');
            setTimeout(() => {
                viewModalOverlay.classList.remove('opacity-0');
                viewModalContainer.classList.remove('scale-95');
            }, 10);
        }

        function closeViewModal() {
            viewModalOverlay.classList.add('opacity-0');
            viewModalContainer.classList.add('scale-95');
            setTimeout(() => {
                viewModalOverlay.classList.add('hidden');
                viewModalOverlay.classList.remove('flex');
            }, 300);
        }

        closeViewModalBtn.addEventListener('click', closeViewModal);
        viewModalOverlay.addEventListener('click', function(e) {
            if (e.target === viewModalOverlay) closeViewModal();
        });

        // Buka modal detail surat saat baris tabel di-klik
        document.body.addEventListener('click', function(e) {
            const targetRow = e.target.closest('[data-action="view"]');
            if (targetRow) {
                openViewModal(targetRow);
            }
        });

        const searchInput = document.getElementById('searchInput');
        const tableRows   = document.querySelectorAll('.surat-row');
        const mobileCards = document.querySelectorAll('.surat-card');
        const noResults   = document.getElementById('noResults');

        function toggleDayGroups(container) {
            if (!container) return;
            container.querySelectorAll(':scope > [data-day-group]').forEach(group => {
                const anyVisible = Array.from(group.querySelectorAll('.surat-row, .surat-card'))
                    .some(el => el.style.display !== 'none');
                group.style.display = anyVisible ? '' : 'none';
            });
        }

        function applyFilters() {
            const q = searchInput.value.trim().toLowerCase();
            let visCount = 0;

            tableRows.forEach(row => {
                const show = !q || row.dataset.nosurat.includes(q) || row.dataset.pengirim.includes(q);
                row.style.display = show ? '' : 'none';
                if (show) visCount++;
            });

            mobileCards.forEach(card => {
                const show = !q || card.dataset.nosurat.includes(q) || card.dataset.pengirim.includes(q);
                card.style.display = show ? '' : 'none';
                if (show) visCount++;
            });

            toggleDayGroups(document.getElementById('tableBody'));
            toggleDayGroups(document.getElementById('mobileCards'));

            if (tableRows.length > 0 || mobileCards.length > 0) {
                noResults.classList.toggle('hidden', visCount > 0);
            }
        }

        searchInput.addEventListener('input', applyFilters);
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>