<section class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
    <header class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-2">Informasi Pribadi</h2>
        <p class="text-sm text-gray-500">Perbarui informasi profil dan alamat email akun Anda.</p>
    </header>
    
    <form method="post" action="{{ route('profile.update') }}" class="space-y-5">
        @csrf @method('patch')
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input type="text" name="name" class="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm" value="{{ old('name', $user->name) }}">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" class="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm" value="{{ old('email', $user->email) }}">
        </div>
        
        <div class="pt-2">
            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white font-semibold rounded-xl hover:opacity-90 transition shadow-md w-full sm:w-auto">
                Simpan Perubahan
            </button>
        </div>
    </form>
</section>