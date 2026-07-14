<section class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
    <header class="mb-6 flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#4B164C] flex items-center justify-center shrink-0">
            <i class="bi bi-shield-lock-fill text-lg"></i>
        </div>
        <div>
            <h2 class="text-xl font-bold text-gray-800">Keamanan Password</h2>
            <p class="text-sm text-gray-500 mt-0.5">Pastikan akun Anda menggunakan password yang panjang dan acak agar tetap aman.</p>
        </div>
    </header>

    <form method="post" action="{{ route('password.update') }}" class="space-y-5">
        @csrf @method('put')

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div class="relative">
                <i class="bi bi-lock text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="password" id="update_current_password" name="current_password" required
                       class="w-full p-3 pl-11 pr-12 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm">
                <button type="button" onclick="togglePassword('update_current_password', 'icon_current_password')" class="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-gray-800 transition">
                    <i id="icon_current_password" class="bi bi-eye text-lg"></i>
                </button>
            </div>
            @error('current_password', 'updatePassword')
                <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
            @enderror
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div class="relative">
                <i class="bi bi-key text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="password" id="update_new_password" name="password" required
                       class="w-full p-3 pl-11 pr-12 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm">
                <button type="button" onclick="togglePassword('update_new_password', 'icon_new_password')" class="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-gray-800 transition">
                    <i id="icon_new_password" class="bi bi-eye text-lg"></i>
                </button>
            </div>
            @error('password', 'updatePassword')
                <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
            @enderror
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div class="relative">
                <i class="bi bi-key-fill text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="password" id="update_confirm_password" name="password_confirmation" required
                       class="w-full p-3 pl-11 pr-12 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DD88CF] focus:border-[#DD88CF] outline-none transition-all shadow-sm">
                <button type="button" onclick="togglePassword('update_confirm_password', 'icon_confirm_password')" class="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-gray-800 transition">
                    <i id="icon_confirm_password" class="bi bi-eye text-lg"></i>
                </button>
            </div>
            @error('password_confirmation', 'updatePassword')
                <p class="text-red-500 text-xs mt-1">{{ $message }}</p>
            @enderror
        </div>

        <div class="pt-2 flex items-center gap-4">
            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white font-semibold rounded-xl hover:opacity-90 transition shadow-md w-full sm:w-auto">
                Save Password
            </button>

            @if (session('status') === 'password-updated')
                <p x-data="{ show: true }" x-show="show" x-transition x-init="setTimeout(() => show = false, 2000)" class="text-sm font-medium text-green-600 flex items-center gap-1.5">
                    <i class="bi bi-check-circle-fill"></i> Tersimpan.
                </p>
            @endif
        </div>
    </form>
</section>

<script>
    function togglePassword(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    }
</script>