@php
    $user = auth()->user();
@endphp

<div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex items-center justify-between">
                <a href="{{ url('/') }}" class="text-lg font-bold text-gray-800">E-Surat</a>

                <form action="{{ url()->current() }}" method="GET" class="flex-1 mx-8">
                    <div class="mx-auto w-full max-w-2xl">
                        <label for="q" class="sr-only">Cari</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            </div>
                            <input id="q" name="q" placeholder="Cari dokumen, nama, atau nomor..." value="{{ request('q') }}"
                                class="w-full h-12 pl-12 pr-4 rounded-full bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white placeholder-white/80 border-0 focus:outline-none shadow-lg"
                            />
                        </div>
                    </div>
                </form>

                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-600">{{ $user->email ?? '' }}</span>
                    <a href="{{ route('profile.edit') }}" class="text-sm text-indigo-600 hover:underline">Edit Profil</a>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: profile card -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center gap-4">
                        <div class="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-600">
                            {{ strtoupper(substr($user->name ?? 'U',0,1)) }}
                        </div>
                        <div>
                            <div class="text-lg font-bold text-gray-900">{{ $user->name ?? 'Pengguna' }}</div>
                            <div class="text-sm text-gray-500">{{ $user->role ?? 'Pengguna' }}</div>
                        </div>
                    </div>

                    <div class="mt-6 space-y-3">
                        <a href="#" class="block text-sm text-gray-700">Ubah Foto Profil</a>
                        <a href="#" class="block text-sm text-gray-700">Ganti Password</a>
                    </div>
                </div>
            </div>

            <!-- Right: details -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-5 flex items-center justify-between border-b border-gray-100">
                        <h3 class="text-lg font-medium text-gray-900">Informasi Pribadi</h3>
                        <a href="{{ route('profile.edit') }}" class="text-sm bg-[#4B164C] text-white px-3 py-1 rounded">Edit</a>
                    </div>
                    <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Nama Lengkap</dt>
                            <dd class="mt-1 text-sm text-gray-900">{{ $user->name ?? '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Email</dt>
                            <dd class="mt-1 text-sm text-gray-900">{{ $user->email ?? '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Nomor Telepon</dt>
                            <dd class="mt-1 text-sm text-gray-900">{{ $user->phone ?? '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Peran</dt>
                            <dd class="mt-1 text-sm text-gray-900">{{ $user->role ?? 'Pengguna' }}</dd>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-5 flex items-center justify-between border-b border-gray-100">
                        <h3 class="text-lg font-medium text-gray-900">Alamat</h3>
                        <a href="#" class="text-sm text-gray-600">Edit</a>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Negara</dt>
                                <dd class="mt-1 text-sm text-gray-900">{{ $user->country ?? '-' }}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Kota</dt>
                                <dd class="mt-1 text-sm text-gray-900">{{ $user->city ?? '-' }}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Kode Pos</dt>
                                <dd class="mt-1 text-sm text-gray-900">{{ $user->postal_code ?? '-' }}</dd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>