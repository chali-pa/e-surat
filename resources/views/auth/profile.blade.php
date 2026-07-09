@php
    $user = auth()->user();
@endphp

<div class="min-h-screen bg-[#F8F6FB] p-8">
    <div class="max-w-6xl mx-auto space-y-8">
        
        <div class="bg-white p-8 rounded-2xl border border-[#E8E8E8] shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-6">
                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-[#4B164C] to-[#DD88CF] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {{ strtoupper(substr($user->name ?? 'U', 0, 1)) }}
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-[#2D2D2D]">{{ $user->name }}</h1>
                    <p class="text-[#7A7A7A]">{{ $user->email }}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">● Active</span>
                        <span class="text-xs text-[#7A7A7A]">Joined 08/07/2026</span>
                    </div>
                </div>
            </div>
            <a href="{{ route('profile.edit') }}" class="px-6 py-2.5 rounded-xl text-white font-medium bg-gradient-to-r from-[#4B164C] to-[#DD88CF] hover:opacity-90 transition shadow-md">
                Edit Profile
            </a>
        </div>

        <div class="bg-white p-8 rounded-2xl border border-[#E8E8E8] shadow-sm">
            <h2 class="text-lg font-semibold text-[#2D2D2D] mb-6">Informasi Pribadi</h2>
            <form action="#" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-[#7A7A7A] mb-2">Nama Lengkap</label>
                    <input type="text" value="{{ $user->name }}" class="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] focus:ring-2 focus:ring-[#DD88CF] focus:border-transparent outline-none transition">
                </div>
                <div>
                    <label class="block text-sm font-medium text-[#7A7A7A] mb-2">Email</label>
                    <input type="email" value="{{ $user->email }}" class="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] focus:ring-2 focus:ring-[#DD88CF] focus:border-transparent outline-none transition">
                </div>
                <button class="px-8 py-3 rounded-xl text-white font-medium bg-gradient-to-r from-[#4B164C] to-[#DD88CF] hover:opacity-90 transition shadow-md">
                    Simpan Perubahan
                </button>
            </form>
        </div>

        <div class="bg-white p-8 rounded-2xl border border-[#E8E8E8] shadow-sm">
            <h2 class="text-lg font-semibold text-[#2D2D2D] mb-6 flex items-center gap-2">
                <i class="bi bi-lock-fill"></i> Keamanan Password
            </h2>
            <form class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-[#7A7A7A] mb-2">Password Lama</label>
                    <input type="password" class="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                </div>
                <div>
                    <label class="block text-sm font-medium text-[#7A7A7A] mb-2">Password Baru</label>
                    <input type="password" class="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-[#7A7A7A] mb-2">Konfirmasi Password Baru</label>
                    <input type="password" class="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] focus:ring-2 focus:ring-[#DD88CF] outline-none transition">
                </div>
                <button class="px-8 py-3 rounded-xl text-white font-medium bg-gradient-to-r from-[#4B164C] to-[#DD88CF] hover:opacity-90 transition shadow-md w-max">
                    Ubah Password
                </button>
            </form>
        </div>

        <div class="bg-red-50 p-8 rounded-2xl border border-red-100 shadow-sm">
            <h2 class="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                <i class="bi bi-exclamation-triangle-fill"></i> Hapus Akun
            </h2>
            <p class="text-sm text-[#7A7A7A] mb-6">Tindakan ini permanen. Semua data Anda akan dihapus secara total dari sistem.</p>
            <button class="px-6 py-2.5 rounded-xl text-white font-medium bg-red-600 hover:bg-red-700 transition">
                Hapus Akun
            </button>
        </div>
    </div>
</div>