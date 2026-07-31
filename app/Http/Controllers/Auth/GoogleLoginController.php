<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleUserSetupService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleLoginController extends Controller
{
    public function __construct(
        private readonly GoogleUserSetupService $googleUserSetup,
    ) {}

    /**
     * Redirect ke halaman consent Google untuk login.
     */
    public function redirect(): RedirectResponse|\Symfony\Component\HttpFoundation\RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle callback dari Google setelah user menyetujui akses.
     *
     * Alur:
     * 1. Jika user dengan google_id sudah ada → login langsung
     * 2. Jika email cocok dengan user yang sudah ada → link google_id, lalu login
     * 3. Jika user baru → buat akun baru, auto-verify email, login
     */
    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            Log::error('Google Login: gagal mendapatkan data user dari Google', [
                'message' => $e->getMessage(),
            ]);

            return redirect()->route('login')
                ->withErrors(['google' => 'Login dengan Google gagal. Silakan coba lagi.']);
        }

        // Get Google token
        $googleToken = [
            'access_token' => $googleUser->token,
            'refresh_token' => $googleUser->refreshToken,
            'expires_in' => $googleUser->expiresIn,
            'token_type' => 'Bearer',
        ];

        // 1. Cari user berdasarkan google_id
        $user = User::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            // 2. Cari user berdasarkan email
            $user = User::where('email', $googleUser->getEmail())->first();

            if ($user) {
                // Link Google ID ke akun yang sudah ada
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'google_token' => $googleToken,
                ]);

                // Setup Google workspace if not already configured
                if (! $user->hasGoogleConfigured()) {
                    $this->googleUserSetup->setupUserGoogleWorkspace($user, $googleToken);
                }
            } else {
                // 3. Buat akun baru
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                    'password' => null,
                    'google_token' => $googleToken,
                ]);

                event(new Registered($user));

                // Setup Google workspace for new user
                $this->googleUserSetup->setupUserGoogleWorkspace($user, $googleToken);
            }
        } else {
            // Update avatar dan token jika berubah
            $user->update([
                'avatar' => $googleUser->getAvatar(),
                'google_token' => $googleToken,
            ]);

            // Setup Google workspace if not already configured
            if (! $user->hasGoogleConfigured()) {
                $this->googleUserSetup->setupUserGoogleWorkspace($user, $googleToken);
            }
        }

        // Auto-verify email jika belum (Google sudah verifikasi)
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
