@include('profile.partials.toast')

<!-- Modal Konfirmasi Keluar -->
<div id="logoutModal" class="fixed inset-0 z-[250] hidden items-center justify-center bg-black/50 p-4">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-6 py-5 bg-gradient-to-r from-[#4B164C] to-[#DD88CF]">
            <h3 class="text-white font-semibold text-lg flex items-center gap-2">
                <i class="bi bi-box-arrow-right"></i> Konfirmasi Keluar
            </h3>
        </div>
        <form id="logoutForm" action="{{ route('logout.password') }}" method="POST" class="p-6 space-y-4">
            @csrf
            <p class="text-sm text-gray-600">Masukkan password akun kamu untuk keluar dari E-Surat.</p>

            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div class="relative">
                    <input type="password" name="password" id="logoutPassword" required autocomplete="current-password"
                        class="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 focus:ring-2 focus:ring-[#DD88CF] outline-none transition"
                        placeholder="Masukkan password">
                    <button type="button" id="toggleLogoutPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabindex="-1">
                        <i class="bi bi-eye" id="toggleLogoutPasswordIcon"></i>
                    </button>
                </div>
                <p id="logoutPasswordError" class="text-red-500 text-sm mt-2 hidden"></p>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeLogoutModal()" class="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">
                    Batal
                </button>
                <button type="submit" id="logoutSubmitBtn" class="px-5 py-3 rounded-xl bg-[#4B164C] text-white font-semibold hover:bg-[#DD88CF] transition flex items-center gap-2 disabled:opacity-70">
                    <span id="logoutSubmitText">Keluar</span>
                    <i class="bi bi-arrow-repeat animate-spin hidden" id="logoutSubmitSpinner"></i>
                </button>
            </div>
        </form>
    </div>
</div>

<script>
    function openLogoutModal() {
        const modal = document.getElementById('logoutModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');

        document.getElementById('logoutPasswordError').classList.add('hidden');
        document.getElementById('logoutPassword').value = '';
        setTimeout(() => document.getElementById('logoutPassword').focus(), 100);
    }

    function closeLogoutModal() {
        const modal = document.getElementById('logoutModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }

    document.addEventListener('click', function (e) {
        const modal = document.getElementById('logoutModal');
        if (e.target === modal) closeLogoutModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLogoutModal();
    });

    const toggleLogoutPwBtn = document.getElementById('toggleLogoutPassword');
    if (toggleLogoutPwBtn) {
        toggleLogoutPwBtn.addEventListener('click', function () {
            const input = document.getElementById('logoutPassword');
            const icon = document.getElementById('toggleLogoutPasswordIcon');
            input.type = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    }

    // Proses Submit via AJAX
    document.getElementById('logoutForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('logoutSubmitBtn');
        const submitText = document.getElementById('logoutSubmitText');
        const spinner = document.getElementById('logoutSubmitSpinner');
        const errorEl = document.getElementById('logoutPasswordError');

        // Reset UI State
        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitText.textContent = 'Memproses...';
        spinner.classList.remove('hidden');

        fetch(form.action, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new FormData(form)
        })
        .then(async (response) => {
            let data = null;
            try { data = await response.json(); } catch (err) { data = null; }

            // Jika respons sukses dan data.success bernilai true (password benar)
            if (response.ok && data && data.success) {
                closeLogoutModal();
                sessionStorage.setItem('logoutToast', data.message || 'Anda berhasil keluar dari akun.');
                
                // Redirect ke URL yang dikirim oleh controller (atau fallback ke '/')
                window.location.href = data.redirect || '/';
                return;
            }

            // Jika gagal (password salah)
            const message = (data && data.message) ? data.message : 'Gagal keluar dari akun. Silakan coba lagi.';
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            
            // Memanggil fungsi toast bawaan yang sudah kamu definisikan di luar file ini
            if(typeof showToast === 'function') {
                showToast(message, 'error');
            }
        })
        .catch(() => {
            const message = 'Terjadi kesalahan jaringan. Gagal keluar dari akun.';
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            
            if(typeof showToast === 'function') {
                showToast(message, 'error');
            }
        })
        .finally(() => {
            // Kembalikan UI State ke awal
            submitBtn.disabled = false;
            submitText.textContent = 'Keluar';
            spinner.classList.add('hidden');
        });
    });
</script>
