@php $user = auth()->user(); @endphp

<div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex items-center gap-4">
                        <div class="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-600">
                            {{ strtoupper(substr($user->name ?? 'U',0,1)) }}
                        </div>
                        <div>
                            <div class="text-lg font-bold text-gray-900">{{ $user->name ?? 'Pengguna' }}</div>
                            <div class="text-sm text-gray-500">{{ $user->email ?? '' }}</div>
                        </div>
                    </div>

                    <div class="mt-6 space-y-2">
                        <a href="#change-password" class="block text-sm text-gray-700">Ganti Password</a>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 space-y-6">
                @if(session('status') == 'profile-updated')
                    <div class="bg-green-50 border border-green-200 text-green-800 rounded p-4">Profil berhasil diperbarui.</div>
                @endif
                @if(session('status') == 'password-updated')
                    <div class="bg-green-50 border border-green-200 text-green-800 rounded p-4">Password berhasil diubah.</div>
                @endif

                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 class="text-lg font-medium text-gray-900">Edit Informasi Pribadi</h3>
                    </div>
                    <form method="POST" action="{{ route('profile.update') }}">
                        @csrf
                        @method('PATCH')
                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                                <input type="text" name="name" value="{{ old('name', $user->name) }}" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                @error('name')<p class="text-red-600 text-sm mt-1">{{ $message }}</p>@enderror
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" value="{{ old('email', $user->email) }}" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                @error('email')<p class="text-red-600 text-sm mt-1">{{ $message }}</p>@enderror
                            </div>

                            <div class="md:col-span-2 flex justify-end">
                                <button type="submit" class="bg-[#4B164C] text-white px-4 py-2 rounded">Simpan Informasi</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div id="change-password" class="bg-white rounded-lg shadow">
                    <div class="px-6 py-5 border-b border-gray-100">
                        <h3 class="text-lg font-medium text-gray-900">Ganti Password</h3>
                    </div>
                    <div class="p-6">
                        <form method="POST" action="{{ route('password.update') }}">
                            @csrf
                            @method('PUT')

                            <div class="grid grid-cols-1 gap-4 max-w-md">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Password Saat Ini</label>
                                    <input type="password" name="current_password" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm">
                                    @error('current_password')<p class="text-red-600 text-sm mt-1">{{ $message }}</p>@enderror
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Password Baru</label>
                                    <input type="password" name="password" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm">
                                    @error('password')<p class="text-red-600 text-sm mt-1">{{ $message }}</p>@enderror
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                                    <input type="password" name="password_confirmation" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm">
                                </div>
                                <div class="flex justify-end">
                                    <button type="submit" class="bg-[#4B164C] text-white px-4 py-2 rounded">Ubah Password</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow">
                    <div class="px-6 py-5 border-b border-gray-100">
                        <h3 class="text-lg font-medium text-gray-900">Hapus Akun</h3>
                    </div>
                    <div class="p-6">
                        <form method="POST" action="{{ route('profile.destroy') }}" onsubmit="return confirm('Anda yakin ingin menghapus akun? Semua data akan hilang.')">
                            @csrf
                            @method('DELETE')
                            <div class="flex justify-end">
                                <button type="submit" class="bg-red-500 text-white px-4 py-2 rounded">Hapus Akun</button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
