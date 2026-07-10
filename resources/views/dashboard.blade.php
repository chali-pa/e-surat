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
        /* Gradient active style between primary and accent */
        .card-filter.active-gradient {
            background: linear-gradient(90deg, #4B164C 0%, #DD88CF 100%);
            color: #ffffff;
            border-color: transparent;
        }
        .card-filter.active-gradient .text-slate-900,
        .card-filter.active-gradient .text-slate-700,
        .card-filter.active-gradient .text-slate-500 {
            color: #ffffff !important;
        }
        .btn-gradient-active {
            background: linear-gradient(90deg, #4B164C 0%, #DD88CF 100%) !important;
            color: #ffffff !important;
            border-color: transparent !important;
        }
        /* Primary button: dominant #4B164C, hover to #DD88CF */
        .btn-primary {
            background: #4B164C;
            color: #ffffff;
            transition: background 200ms ease, color 200ms ease;
            border-color: transparent;
        }
        .btn-primary:hover {
            background: #DD88CF;
            color: #ffffff;
        }
        .table-action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 2.5rem;
            width: 2.5rem;
            border-radius: 0.75rem;
            color: #475569;
            background: transparent;
            border: none;
            transition: background 150ms ease, color 150ms ease;
        }
        .table-action-btn:hover {
            background: #f8fafc;
        }
        .table-action-delete {
            color: #ef4444;
        }
    </style>
</head>
<body>

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
            <a href="{{ route('profile.edit') }}" class="flex items-center p-3 rounded-xl hover:bg-gray-100 transition">
                <i class="bi bi-person-fill text-lg"></i><span class="ml-4 menu-text">Profil</span>
            </a>
            <button type="button" onclick="openLogoutModal()" class="w-full flex items-center p-3 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-600 transition mt-4 border-t border-gray-100 pt-4">
                <i class="bi bi-box-arrow-right text-lg"></i><span class="ml-4 menu-text">Keluar</span>
            </button>
        </nav>
    </aside>

    <main class="main-content min-h-screen p-4 md:p-8">
        <div class="max-w-6xl mx-auto">
            <section class="space-y-6">
                <div class="grid gap-4 md:grid-cols-4">
                    <button type="button" data-filter="all" class="card-filter rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DD88CF]">
                        <div class="flex items-center gap-2 text-slate-700">
                            <i class="bi bi-envelope-paper-fill text-xl text-slate-500"></i>
                            <span class="text-sm font-medium">Total Surat Masuk</span>
                        </div>
                        <p id="count-all" class="mt-4 text-3xl font-semibold text-slate-900">0</p>
                    </button>

                    <button type="button" data-filter="pending" class="card-filter rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DD88CF]">
                        <div class="flex items-center gap-2 text-slate-700">
                            <i class="bi bi-exclamation-circle-fill text-xl text-orange-500"></i>
                            <span class="text-sm font-medium">Surat Belum Direspon</span>
                        </div>
                        <p id="count-pending" class="mt-4 text-3xl font-semibold text-slate-900">0</p>
                    </button>

                    <button type="button" data-filter="processing" class="card-filter rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DD88CF]">
                        <div class="flex items-center gap-2 text-slate-700">
                            <i class="bi bi-gear-fill text-xl text-slate-500"></i>
                            <span class="text-sm font-medium">Surat Dalam Proses</span>
                        </div>
                        <p id="count-processing" class="mt-4 text-3xl font-semibold text-slate-900">0</p>
                    </button>

                    <button type="button" data-filter="done" class="card-filter rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DD88CF]">
                        <div class="flex items-center gap-2 text-slate-700">
                            <i class="bi bi-check-circle-fill text-xl text-emerald-500"></i>
                            <span class="text-sm font-medium">Surat Selesai</span>
                        </div>
                        <p id="count-done" class="mt-4 text-3xl font-semibold text-slate-900">0</p>
                    </button>
                </div>

                <div class="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 class="text-2xl font-semibold text-[#4B164C]">Riwayat Surat</h2>
                            <p class="mt-1 text-sm text-slate-500">Kelola semua surat masuk dan lihat statusnya secara real-time.</p>
                        </div>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div class="flex-1 min-w-[260px]">
                                <label for="searchInput" class="sr-only">Cari No Surat atau Pengirim</label>
                                <input id="searchInput" type="text" placeholder="Cari No Surat atau Pengirim..." class="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#DD88CF] focus:ring-2 focus:ring-[#DD88CF]/20" />
                            </div>
                            <button id="addButton" type="button" class="inline-flex items-center justify-center rounded-xl btn-primary px-5 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DD88CF]/50">
                                + Tambah
                            </button>
                        </div>
                    </div>

                    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-slate-200 text-sm">
                                <thead class="bg-slate-100">
                                    <tr class="text-left text-slate-700">
                                        <th class="px-5 py-5 font-medium">No</th>
                                        <th class="px-5 py-5 font-medium">No Surat</th>
                                        <th class="px-5 py-5 font-medium">Tanggal Buat</th>
                                        <th class="px-5 py-5 font-medium">Tanggal Masuk</th>
                                        <th class="px-5 py-5 font-medium">Pengirim</th>
                                        <th class="px-5 py-5 font-medium">Nama Surat</th>
                                        <th class="px-5 py-5 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody" class="divide-y divide-slate-100 bg-white text-slate-700">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <div id="modalOverlay" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/40">
        <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <h3 id="modalTitle" class="text-lg font-semibold text-[#4B164C]">Tambah Surat</h3>
            <form id="suratForm" class="mt-4 grid grid-cols-1 gap-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input id="inputNoSurat" type="text" placeholder="No Surat" class="rounded-lg border border-slate-200 px-3 py-2" required />
                    <input id="inputTanggalBuat" type="date" placeholder="Tanggal Buat" class="rounded-lg border border-slate-200 px-3 py-2" required />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input id="inputTanggalMasuk" type="date" placeholder="Tanggal Masuk" class="rounded-lg border border-slate-200 px-3 py-2" required />
                    <input id="inputPengirim" type="text" placeholder="Pengirim" class="rounded-lg border border-slate-200 px-3 py-2" required />
                </div>
                <input id="inputNamaSurat" type="text" placeholder="Nama Surat" class="rounded-lg border border-slate-200 px-3 py-2" required />

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Status Surat</label>
                    <select id="inputStatus" class="w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option value="pending">Belum Direspon</option>
                        <option value="processing">Dalam Proses</option>
                        <option value="done">Selesai</option>
                    </select>
                </div>

                <div class="mt-4 flex justify-end gap-2">
                    <button type="button" id="cancelBtn" class="rounded-lg border border-slate-200 px-4 py-2">Batal</button>
                    <button type="submit" id="saveBtn" class="rounded-lg bg-[#4B164C] px-4 py-2 text-white">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Toggle sidebar
        document.getElementById('toggleBtn').addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });

        /***** Manajemen Surat: Front-end Logic (vanilla JS) *****/
        document.addEventListener('DOMContentLoaded', () => {
            // Elements
            const tableBody = document.getElementById('tableBody');
            const searchInput = document.getElementById('searchInput');
            const addButton = document.getElementById('addButton');
            const cardButtons = Array.from(document.querySelectorAll('.card-filter'));
            const counts = {
                all: document.getElementById('count-all'),
                pending: document.getElementById('count-pending'),
                processing: document.getElementById('count-processing'),
                done: document.getElementById('count-done')
            };

            // Modal elements
            const modalOverlay = document.getElementById('modalOverlay');
            const modalTitle = document.getElementById('modalTitle');
            const suratForm = document.getElementById('suratForm');
            const inputNoSurat = document.getElementById('inputNoSurat');
            const inputTanggalBuat = document.getElementById('inputTanggalBuat');
            const inputTanggalMasuk = document.getElementById('inputTanggalMasuk');
            const inputPengirim = document.getElementById('inputPengirim');
            const inputNamaSurat = document.getElementById('inputNamaSurat');
            const inputStatus = document.getElementById('inputStatus');
            const cancelBtn = document.getElementById('cancelBtn');

            // State
            let activeFilter = 'all';
            let nextId = 6; // next id for dummy data
            let editingId = null; // if editing existing record

            // Dummy initial data
            const suratData = [
                { id: 1, noSurat: 'SM-2026-001', tanggalBuat: '2026-07-01', tanggalMasuk: '2026-07-02', pengirim: 'Dewi Ariani', namaSurat: 'Pengajuan Cuti', status: 'pending' },
                { id: 2, noSurat: 'SM-2026-002', tanggalBuat: '2026-07-02', tanggalMasuk: '2026-07-03', pengirim: 'Rian Saputra', namaSurat: 'Permintaan Materai', status: 'processing' },
                { id: 3, noSurat: 'SM-2026-003', tanggalBuat: '2026-07-03', tanggalMasuk: '2026-07-04', pengirim: 'Mira Yustina', namaSurat: 'Surat Undangan', status: 'done' },
                { id: 4, noSurat: 'SM-2026-004', tanggalBuat: '2026-07-04', tanggalMasuk: '2026-07-05', pengirim: 'Ardi H.', namaSurat: 'Laporan Kegiatan', status: 'pending' },
                { id: 5, noSurat: 'SM-2026-005', tanggalBuat: '2026-07-05', tanggalMasuk: '2026-07-06', pengirim: 'Nadia S.', namaSurat: 'Permohonan Izin', status: 'done' }
            ];

            const statusLabel = {
                pending: 'Belum Direspon',
                processing: 'Dalam Proses',
                done: 'Selesai'
            };

            const statusClasses = {
                pending: 'bg-orange-100 text-orange-700',
                processing: 'bg-sky-100 text-sky-700',
                done: 'bg-emerald-100 text-emerald-700'
            };

            // Helpers
            function openModal(isEdit = false) {
                modalOverlay.classList.remove('hidden');
                modalOverlay.classList.add('flex');
                modalTitle.textContent = isEdit ? 'Edit Surat' : 'Tambah Surat';
            }
            function closeModal() {
                modalOverlay.classList.add('hidden');
                modalOverlay.classList.remove('flex');
                suratForm.reset();
                editingId = null;
                // remove gradient state from add button when modal closed
                if (addButton) addButton.classList.remove('btn-gradient-active', 'active-gradient');
            }

            function updateCounts() {
                counts.all.textContent = suratData.length;
                counts.pending.textContent = suratData.filter(i => i.status === 'pending').length;
                counts.processing.textContent = suratData.filter(i => i.status === 'processing').length;
                counts.done.textContent = suratData.filter(i => i.status === 'done').length;
            }

            function getFilteredData() {
                const q = searchInput.value.trim().toLowerCase();
                return suratData.filter(item => {
                    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
                    const matchesSearch = item.noSurat.toLowerCase().includes(q) || item.pengirim.toLowerCase().includes(q);
                    return matchesFilter && matchesSearch;
                });
            }

            function renderTable() {
                const rows = getFilteredData();
                tableBody.innerHTML = rows.map((item, idx) => `
                    <tr class="transition hover:bg-slate-50">
                        <td class="px-5 py-4 font-medium text-slate-900">${idx + 1}</td>
                        <td class="px-5 py-4 text-slate-700">${item.noSurat}</td>
                        <td class="px-5 py-4 text-slate-700">${item.tanggalBuat}</td>
                        <td class="px-5 py-4 text-slate-700">${item.tanggalMasuk}</td>
                        <td class="px-5 py-4 text-slate-700">${item.pengirim}</td>
                        <td class="px-5 py-4 text-slate-700">${item.namaSurat}</td>
                        <td class="px-5 py-4 text-right">
                            <div class="inline-flex items-center justify-end gap-2">
                                <button data-action="view" data-id="${item.id}" class="table-action-btn" title="Lihat"><i class="bi bi-eye"></i></button>
                                <button data-action="edit" data-id="${item.id}" class="table-action-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                                <button data-action="delete" data-id="${item.id}" class="table-action-btn table-action-delete" title="Hapus"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('');
                attachRowActions();
            }

            function attachRowActions() {
                tableBody.querySelectorAll('button[data-action]').forEach(btn => {
                    btn.onclick = (e) => {
                        const action = btn.dataset.action;
                        const id = Number(btn.dataset.id);
                        const index = suratData.findIndex(s => s.id === id);
                        if (action === 'view') {
                            const s = suratData[index];
                            alert(`Detail:\nNo Surat: ${s.noSurat}\nPengirim: ${s.pengirim}\nNama: ${s.namaSurat}\nStatus: ${statusLabel[s.status]}`);
                        }
                        if (action === 'edit') {
                            const s = suratData[index];
                            if (s) {
                                editingId = s.id;
                                inputNoSurat.value = s.noSurat;
                                inputTanggalBuat.value = s.tanggalBuat;
                                inputTanggalMasuk.value = s.tanggalMasuk;
                                inputPengirim.value = s.pengirim;
                                inputNamaSurat.value = s.namaSurat;
                                inputStatus.value = s.status;
                                openModal(true);
                            }
                        }
                        if (action === 'delete') {
                            if (confirm('Hapus surat ini?')) {
                                if (index !== -1) {
                                    suratData.splice(index, 1);
                                    updateCounts();
                                    renderTable();
                                }
                            }
                        }
                    };
                });
            }

            // Add button opens modal for new surat
            addButton.addEventListener('click', () => {
                editingId = null;
                suratForm.reset();
                // toggle persistent gradient on add button to match active card
                addButton.classList.add('btn-gradient-active', 'active-gradient');
                openModal(false);
            });

            // Cancel modal
            cancelBtn.addEventListener('click', closeModal);

            // Submit form: add or update
            suratForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const payload = {
                    id: editingId || nextId++,
                    noSurat: inputNoSurat.value.trim(),
                    tanggalBuat: inputTanggalBuat.value,
                    tanggalMasuk: inputTanggalMasuk.value,
                    pengirim: inputPengirim.value.trim(),
                    namaSurat: inputNamaSurat.value.trim(),
                    status: inputStatus.value
                };

                if (editingId) {
                    const idx = suratData.findIndex(s => s.id === editingId);
                    if (idx !== -1) suratData[idx] = payload;
                } else {
                    // add to top
                    suratData.unshift(payload);
                }

                updateCounts();
                renderTable();
                closeModal();
            });

            // Card filter behavior: toggle active-gradient on selected card
            function setActiveCardVisual(filterKey) {
                cardButtons.forEach(b => {
                    if (b.dataset.filter === filterKey) {
                        b.classList.add('active-gradient');
                        b.classList.remove('ring-2', 'ring-[#DD88CF]');
                    } else {
                        b.classList.remove('active-gradient');
                        b.classList.remove('ring-2', 'ring-[#DD88CF]');
                    }
                });
            }

            cardButtons.forEach(btn => btn.addEventListener('click', () => {
                activeFilter = btn.dataset.filter;
                setActiveCardVisual(activeFilter);
                renderTable();
            }));

            // Search
            searchInput.addEventListener('input', renderTable);

            // Add button gradient press visual (transient while pressing)
            addButton.addEventListener('mousedown', () => addButton.classList.add('btn-gradient-active'));
            addButton.addEventListener('mouseup', () => addButton.classList.remove('btn-gradient-active'));
            addButton.addEventListener('mouseleave', () => addButton.classList.remove('btn-gradient-active'));

            // Initialize
            updateCounts();
            // set default active card visual
            setActiveCardVisual('all');
            renderTable();
        });
    </script>

    @include('profile.partials.logout-modal')
</body>
</html>