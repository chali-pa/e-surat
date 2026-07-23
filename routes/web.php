<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SuratController;
use App\Models\Surat;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->name('welcome');

Route::get('/dashboard', function () {
    // Data surat terbaru diambil langsung dari database yang sama
    // dengan yang diisi lewat halaman Kelola Surat.
    $surats = Surat::orderByDesc('created_at')->get();
    return view('dashboard', compact('surats'));
})->middleware(['auth'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Keluar dari akun dengan konfirmasi password
    Route::post('/logout-password', [AuthController::class, 'logoutWithPassword'])
        ->name('logout.password');

    // Semua route surat sekarang wajib login, sama seperti dashboard
    Route::get('/surat', [SuratController::class, 'index'])->name('surat.index');
    Route::get('/surat/create', [SuratController::class, 'create'])->name('surat.create');
    Route::post('/surat', [SuratController::class, 'store'])->name('surat.store');
    Route::get('/surat/{id}/preview/{filename?}', [SuratController::class, 'preview'])->name('surat.preview');
    Route::get('/surat/{id}/edit', [SuratController::class, 'edit'])->name('surat.edit');
    Route::put('/surat/{id}', [SuratController::class, 'update'])->name('surat.update');
    Route::delete('/surat/{id}', [SuratController::class, 'destroy'])->name('surat.destroy');


});

require __DIR__.'/auth.php';