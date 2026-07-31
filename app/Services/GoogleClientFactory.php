<?php

namespace App\Services;

use Google\Client;
use Google\Service\Drive;
use Google\Service\Sheets;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GoogleClientFactory
{
    private ?array $userToken = null;

    public function setUserToken(?array $token): void
    {
        $this->userToken = $token;
    }

    /**
     * Konfigurasi dasar (client id/secret/folder/sheet) sudah lengkap.
     * Tidak menjamin akun sudah terhubung — cek isConnected() untuk itu.
     */
    public function isConfigured(): bool
    {
        $folderId = config('google.drive_folder_id');
        $sheetId = config('google.sheet_id');
        $hasOAuth = $this->hasOAuthClientConfig();
        $isConnected = $this->isConnected();
        $hasServiceAccount = $this->hasServiceAccount();
        $hasUserToken = !empty($this->userToken);

        Log::info('isConfigured check', [
            'has_oauth_client_config' => $hasOAuth,
            'is_connected' => $isConnected,
            'has_user_token' => $hasUserToken,
            'folder_id' => $folderId,
            'sheet_id' => $sheetId,
            'token_path' => config('google.oauth.token_path'),
            'token_exists' => file_exists(config('google.oauth.token_path'))
        ]);

        return ($hasServiceAccount || ($hasOAuth && ($isConnected || $hasUserToken)))
            && is_string($folderId) && $folderId !== ''
            && is_string($sheetId) && $sheetId !== '';
    }

    /**
     * Apakah Service Account (credentials.json) tersedia
     */
    public function hasServiceAccount(): bool
    {
        $path = config('google.credentials');
        return is_string($path) && file_exists($path);
    }

    /**
     * Apakah Client ID & Secret sudah diisi di .env.
     */
    public function hasOAuthClientConfig(): bool
    {
        return filled(config('google.oauth.client_id'))
            && filled(config('google.oauth.client_secret'));
    }

    /**
     * Apakah akun Google sudah pernah login & tersimpan token-nya.
     */
    public function isConnected(): bool
    {
        return file_exists(config('google.oauth.token_path'));
    }

    public function makeClientForUser(\App\Models\User $user): Client
    {
        $this->setUserToken($user->getGoogleToken());
        return $this->makeClient();
    }

    public function makeClient(): Client
    {
        $client = $this->baseClient();

        // 1. Prioritaskan Service Account jika tersedia
        if ($this->hasServiceAccount()) {
            $client->setAuthConfig(config('google.credentials'));
            return $client;
        }

        // 2. Prioritaskan user token jika tersedia (untuk multi-user)
        if ($this->userToken) {
            $token = $this->userToken;
            $client->setAccessToken($token);

            if ($client->isAccessTokenExpired()) {
                $refreshToken = $token['refresh_token'] ?? $client->getRefreshToken();

                if (! $refreshToken) {
                    throw new RuntimeException('Refresh token tidak tersedia. Hubungkan ulang akun Google.');
                }

                $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);

                if (isset($newToken['error'])) {
                    throw new RuntimeException('Gagal memperbarui token Google: ' . ($newToken['error_description'] ?? $newToken['error']));
                }

                if (! isset($newToken['refresh_token'])) {
                    $newToken['refresh_token'] = $refreshToken;
                }

                // Update user token in database if authenticated
                if (auth()->check()) {
                    auth()->user()->setGoogleToken($newToken);
                }

                $this->userToken = $newToken;
                $client->setAccessToken($newToken);
            }

            return $client;
        }

        // 3. Fallback ke OAuth global jika tidak ada Service Account dan user token
        if (! $this->hasOAuthClientConfig()) {
            throw new RuntimeException('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET belum diisi di .env, dan credentials.json tidak ditemukan.');
        }

        $tokenPath = config('google.oauth.token_path');

        if (! file_exists($tokenPath)) {
            throw new RuntimeException('Akun Google belum terhubung. Buka /google/connect untuk menghubungkan akun.');
        }

        $token = json_decode(file_get_contents($tokenPath), true);

        if (! is_array($token)) {
            throw new RuntimeException('Token Google rusak/tidak valid. Hubungkan ulang lewat /google/connect.');
        }

        $client->setAccessToken($token);

        if ($client->isAccessTokenExpired()) {
            $refreshToken = $token['refresh_token'] ?? $client->getRefreshToken();

            if (! $refreshToken) {
                throw new RuntimeException('Refresh token tidak tersedia. Hubungkan ulang akun Google lewat /google/connect.');
            }

            $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);

            if (isset($newToken['error'])) {
                throw new RuntimeException('Gagal memperbarui token Google: ' . ($newToken['error_description'] ?? $newToken['error']));
            }

            if (! isset($newToken['refresh_token'])) {
                $newToken['refresh_token'] = $refreshToken;
            }

            $this->saveToken($newToken);
            $client->setAccessToken($newToken);
        }

        return $client;
    }

    public function driveService(): Drive
    {
        return new Drive($this->makeClient());
    }

    public function sheetsService(): Sheets
    {
        return new Sheets($this->makeClient());
    }

    /**
     * URL untuk mengarahkan admin ke halaman consent Google (dipakai oleh
     * GoogleAuthController::redirect()).
     */
    public function authUrl(): string
    {
        if (! $this->hasOAuthClientConfig()) {
            throw new RuntimeException('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET belum diisi di .env.');
        }

        return $this->baseClient()->createAuthUrl();
    }

    /**
     * Tukar authorization code dari Google menjadi access/refresh token,
     * lalu simpan ke storage/app/google/token.json.
     */
    public function storeTokenFromCode(string $code): void
    {
        Log::info('GoogleClientFactory: starting token exchange', ['code_length' => strlen($code)]);

        $client = $this->baseClient();

        Log::info('GoogleClientFactory: base client created');

        $token = $client->fetchAccessTokenWithAuthCode($code);

        Log::info('GoogleClientFactory: token exchange completed', ['has_error' => isset($token['error'])]);

        if (isset($token['error'])) {
            Log::error('GoogleClientFactory: token exchange failed', [
                'error' => $token['error'],
                'error_description' => $token['error_description'] ?? null
            ]);
            throw new RuntimeException('Gagal menghubungkan akun Google: ' . ($token['error_description'] ?? $token['error']));
        }

        Log::info('GoogleClientFactory: saving token', ['token_keys' => array_keys($token)]);
        $this->saveToken($token);
        Log::info('GoogleClientFactory: token saved successfully');
    }

    public function disconnect(): void
    {
        $path = config('google.oauth.token_path');

        if (file_exists($path)) {
            unlink($path);
        }
    }

    private function baseClient(): Client
    {
        $client = new Client();
        $client->setClientId(config('google.oauth.client_id'));
        $client->setClientSecret(config('google.oauth.client_secret'));
        $client->setRedirectUri(config('google.oauth.redirect_uri'));
        $client->setScopes([
            Drive::DRIVE,
            Sheets::SPREADSHEETS,
        ]);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        if (app()->environment('local')) {
            $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);
            $client->setHttpClient($guzzleClient);
        }

        return $client;
    }

    private function saveToken(array $token): void
    {
        $path = config('google.oauth.token_path');
        $dir = dirname($path);

        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        file_put_contents($path, json_encode($token));
        @chmod($path, 0666);
    }
}