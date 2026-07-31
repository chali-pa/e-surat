<section class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
    <header class="mb-6 flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#4B164C] flex items-center justify-center shrink-0">
            <i class="bi bi-google text-lg"></i>
        </div>
        <div>
            <h2 class="text-xl font-bold text-gray-800">Akun Terhubung</h2>
            <p class="text-sm text-gray-500 mt-0.5">Kelola akun Google yang terhubung untuk mempermudah login.</p>
        </div>
    </header>

    <div class="space-y-4">
        @if(auth()->user()->google_id)
            <div class="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <img src="{{ asset('image/google.png') }}" onerror="this.src='https://www.google.com/favicon.ico'" alt="Google" class="w-5 h-5">
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">Google</p>
                        <p class="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <i class="bi bi-check-circle-fill text-green-500"></i> Terhubung
                        </p>
                    </div>
                </div>
                <div class="text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                    Aktif
                </div>
            </div>
        @else
            <div class="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 border border-gray-200 border-dashed rounded-xl bg-white hover:border-[#DD88CF] hover:bg-[#DD88CF]/5 transition-colors group">
                <div class="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                    <div class="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:shadow transition">
                        <i class="bi bi-google text-gray-400 group-hover:text-[#4B164C] text-xl transition"></i>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800">Hubungkan Google</p>
                        <p class="text-xs text-gray-500 mt-0.5">Gunakan akun Google Anda untuk login cepat.</p>
                    </div>
                </div>
                <a href="{{ route('auth.google') }}" class="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition shadow-sm text-center flex items-center justify-center gap-2">
                    <img src="{{ asset('image/google.png') }}" onerror="this.src='https://www.google.com/favicon.ico'" alt="Google" class="w-4 h-4"> Hubungkan
                </a>
            </div>
        @endif
    </div>
</section>
