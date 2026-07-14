<form method="post" action="{{ route('profile.destroy') }}" class="space-y-4" onsubmit="return confirm('Yakin ingin menghapus akun Anda? Tindakan ini tidak dapat dibatalkan.');">
    @csrf
    @method('delete')

    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div class="relative">
            <i class="bi bi-lock text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
            <input type="password" id="delete_password" name="password" required
                   placeholder="Masukkan password untuk konfirmasi"
                   class="w-full p-3 pl-11 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none transition-all shadow-sm">
        </div>
        @error('password', 'userDeletion')
            <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
        @enderror
    </div>

    <div class="pt-2">
        <button type="submit" class="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition shadow-md w-full sm:w-auto">
            <i class="bi bi-trash3-fill mr-1"></i> Hapus Akun Saya
        </button>
    </div>
</form>