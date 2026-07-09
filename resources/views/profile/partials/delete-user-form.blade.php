<section class="space-y-4">
    <p class="text-sm text-gray-600 leading-relaxed">Setelah akun dihapus, semua data akan hilang secara permanen. Harap konfirmasi dengan password Anda.</p>
    
    <button onclick="document.getElementById('delete-modal').classList.remove('hidden')" 
            class="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 w-full sm:w-auto transition shadow-sm">
        Hapus Akun Saya
    </button>

    <div id="delete-modal" class="{{ $errors->userDeletion->isNotEmpty() ? '' : 'hidden' }} fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
        <div class="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <form method="post" action="{{ route('profile.destroy') }}">
                @csrf @method('delete')
                
                <h2 class="text-xl font-bold text-gray-900 mb-2">Konfirmasi Hapus Akun</h2>
                <p class="text-sm text-gray-500 mb-6">Tindakan ini tidak dapat dibatalkan. Masukkan password Anda untuk melanjutkan.</p>
                
                <div class="relative mb-2">
                    <input type="password" id="delete_password" name="password" placeholder="Password Anda" 
                           class="w-full p-3 pr-12 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" required>
                    
                    <button type="button" onclick="toggleDeletePassword()" class="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-gray-800 transition">
                        <i id="delete_eye_icon" class="bi bi-eye text-lg"></i>
                    </button>
                </div>

                @if ($errors->userDeletion->has('password'))
                    <p class="text-red-500 text-sm mb-4"><i class="bi bi-exclamation-circle-fill mr-1"></i> {{ $errors->userDeletion->first('password') }}</p>
                @else
                    <div class="mb-6"></div> @endif
                
                <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <button type="button" onclick="document.getElementById('delete-modal').classList.add('hidden')" class="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium w-full sm:w-auto transition">
                        Batal
                    </button>
                    <button type="submit" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium w-full sm:w-auto transition shadow-sm">
                        Hapus Permanen
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function toggleDeletePassword() {
            const passwordInput = document.getElementById('delete_password');
            const eyeIcon = document.getElementById('delete_eye_icon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.classList.remove('bi-eye');
                eyeIcon.classList.add('bi-eye-slash'); // Ganti jadi icon coret
            } else {
                passwordInput.type = 'password';
                eyeIcon.classList.remove('bi-eye-slash');
                eyeIcon.classList.add('bi-eye'); // Ganti kembali ke icon mata biasa
            }
        }
    </script>
</section>