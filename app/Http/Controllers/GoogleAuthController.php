<?php

namespace App\Http\Controllers;

use App\Services\GoogleClientFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly GoogleClientFactory $googleClientFactory,
    ) {}

    /**
     * Arahkan admin ke halaman consent Google.
     * Login pakai akun Gmail yang memiliki folder Drive & Sheet tujuan.
     */
    public function redirect()
    {
        try {
            return redirect()->away($this->googleClientFactory->authUrl());
        } catch (\Throwable $e) {
            return redirect()->route('surat.index')->withErrors(['google' => $e->getMessage()]);
        }
    }

    /**
     * Callback setelah admin menyetujui akses di Google.
     */
    public function callback(Request $request)
    {
        Log::info('Google OAuth callback received', [
            'all_params' => $request->query->all(),
            'has_code' => $request->has('code'),
            'has_error' => $request->has('error'),
            'url' => $request->fullUrl()
        ]);

        if ($request->filled('error')) {
            Log::error('Google OAuth error', [
                'error' => $request->query('error'),
                'error_description' => $request->query('error_description')
            ]);

            $errorMsg = 'Otorisasi Google dibatalkan: ' . $request->query('error');
            if ($request->query('error_description')) {
                $errorMsg .= ' (' . $request->query('error_description') . ')';
            }

            return redirect()->route('surat.index')
                ->withErrors(['google' => $errorMsg]);
        }

        $code = $request->query('code');

        if (! $code) {
            Log::error('Google OAuth callback: no authorization code received', [
                'query_params' => $request->query->all(),
                'redirect_uri' => config('google.oauth.redirect_uri'),
                'app_url' => config('app.url')
            ]);

            return redirect()->route('surat.index')
                ->withErrors([
                    'google' => 'Autorisasi Google gagal - tidak ada authorization code. ' .
                    'Pastikan redirect URI di Google Cloud Console cocok dengan: ' . config('google.oauth.redirect_uri')
                ]);
        }

        try {
            Log::info('Google OAuth: attempting to store token from code', ['code_length' => strlen($code)]);
            $this->googleClientFactory->storeTokenFromCode($code);
            Log::info('Google OAuth: token stored successfully');
        } catch (\Throwable $e) {
            Log::error('Google OAuth: failed to store token', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('surat.index')
                ->withErrors([
                    'google' => 'Gagal menghubungkan akun Google: ' . $e->getMessage() .
                    '. Cek file storage/logs/laravel.log untuk detail error.'
                ]);
        }

        return redirect()->route('surat.index')
            ->with('success', 'Akun Google berhasil terhubung. Upload ke Drive & Sheets sekarang bisa dipakai.');
    }

    public function disconnect()
    {
        $this->googleClientFactory->disconnect();

        return redirect()->route('surat.index')->with('success', 'Akun Google telah diputus.');
    }

    /**
     * Debug endpoint untuk mengecek konfigurasi Google
     */
    public function debug()
    {
        $debugInfo = [
            'oauth_config' => [
                'client_id' => config('google.oauth.client_id'),
                'client_secret' => config('google.oauth.client_secret') ? '***SET***' : 'NOT SET',
                'redirect_uri' => config('google.oauth.redirect_uri'),
                'token_path' => config('google.oauth.token_path'),
                'token_exists' => file_exists(config('google.oauth.token_path')),
            ],
            'drive_config' => [
                'folder_id' => config('google.drive_folder_id'),
                'folder_id_set' => !empty(config('google.drive_folder_id')),
            ],
            'sheet_config' => [
                'sheet_id' => config('google.sheet_id'),
                'sheet_name' => config('google.sheet_name'),
                'sheet_id_set' => !empty(config('google.sheet_id')),
            ],
            'app_config' => [
                'app_url' => config('app.url'),
                'app_env' => config('app.env'),
            ],
            'status' => [
                'has_oauth_config' => $this->googleClientFactory->hasOAuthClientConfig(),
                'is_connected' => $this->googleClientFactory->isConnected(),
                'is_configured' => $this->googleClientFactory->isConfigured(),
            ],
        ];

        return response()->json($debugInfo);
    }
}