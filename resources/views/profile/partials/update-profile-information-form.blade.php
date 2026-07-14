<section class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
    <header class="mb-6 flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#4B164C] flex items-center justify-center shrink-0">
            <i class="bi bi-person-vcard-fill text-lg"></i>
        </div>
        <div>
            <h2 class="text-xl font-bold text-gray-800">Informasi Pribadi</h2>
            <p class="text-sm text-gray-500 mt-0.5">Perbarui informasi profil dan alamat email akun Anda.</p>
        </div>
    </header>

    <form method="post" action="{{ route('profile.update') }}" class="space-y-5">
        @csrf @method('patch')

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <div class="relative">
                <i class="bi bi-person text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="text" name="name" class="w-full p-3 pl-11 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm" value="{{ old('name', $user->name) }}">
            </div>
            @error('name')
                <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
            @enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="relative">
                <i class="bi bi-envelope text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="email" name="email" class="w-full p-3 pl-11 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm" value="{{ old('email', $user->email) }}">
            </div>
            @error('email')
                <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
            @enderror
        </div>

        <div class="pt-2 flex items-center gap-4">
            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white font-semibold rounded-xl hover:opacity-90 transition shadow-md w-full sm:w-auto">
                Simpan Perubahan
            </button>

            @if (session('status') === 'profile-updated')
                <p class="text-sm font-medium text-green-600 flex items-center gap-1.5">
                    <i class="bi bi-check-circle-fill"></i> Tersimpan.
                </p>
            @endif
        </div>
    </form>
</section>