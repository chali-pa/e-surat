<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Backend\ProfileController;
use App\Http\Controllers\Backend\SuratController;
use App\Http\Controllers\Backend\SuratKeluarController;
use App\Services\GoogleSheetService;
use App\Services\GoogleSheetKeluarService;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleAuthController;

Route::get('/', function () {
    return view('frontend.welcome');
})->name('welcome');

Route::get('/dashboard', function (GoogleSheetService $googleSheet, GoogleSheetKeluarService $googleSheetKeluar) {
    // Set user context for Google services
    $user = auth()->user();
    $googleSheet->setUser($user);
    $googleSheetKeluar->setUser($user);
    
    $surats = $googleSheet->all();
    $suratsKeluar = $googleSheetKeluar->all();

    return view('backend.dashboard', compact('surats', 'suratsKeluar'));
})->middleware(['auth'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/logout-password', [AuthController::class, 'logoutWithPassword'])
        ->name('logout.password');

    Route::get('/surat', [SuratController::class, 'index'])->name('surat.index');
    Route::get('/surat/create', [SuratController::class, 'create'])->name('surat.create');
    Route::post('/surat', [SuratController::class, 'store'])->name('surat.store');
    Route::get('/surat/{id}/preview/{filename?}', [SuratController::class, 'preview'])->name('surat.preview');
    Route::get('/surat/{id}/edit', [SuratController::class, 'edit'])->name('surat.edit');
    Route::put('/surat/{id}', [SuratController::class, 'update'])->name('surat.update');
    Route::delete('/surat/{id}', [SuratController::class, 'destroy'])->name('surat.destroy');

    Route::get('/surat-keluar', [SuratKeluarController::class, 'index'])->name('surat_keluar.index');
    Route::get('/surat-keluar/create', [SuratKeluarController::class, 'create'])->name('surat_keluar.create');
    Route::post('/surat-keluar', [SuratKeluarController::class, 'store'])->name('surat_keluar.store');
    Route::get('/surat-keluar/{id}/preview/{filename?}', [SuratKeluarController::class, 'preview'])->name('surat_keluar.preview');
    Route::get('/surat-keluar/{id}/edit', [SuratKeluarController::class, 'edit'])->name('surat_keluar.edit');
    Route::put('/surat-keluar/{id}', [SuratKeluarController::class, 'update'])->name('surat_keluar.update');
    Route::delete('/surat-keluar/{id}', [SuratKeluarController::class, 'destroy'])->name('surat_keluar.destroy');

     Route::get('/google/connect', [GoogleAuthController::class, 'redirect'])->name('google.connect');
    Route::get('/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
    Route::post('/google/disconnect', [GoogleAuthController::class, 'disconnect'])->name('google.disconnect');
    Route::get('/google/debug', [GoogleAuthController::class, 'debug'])->name('google.debug');
});
   
require __DIR__.'/auth.php';
