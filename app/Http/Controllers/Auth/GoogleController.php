<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google.
     */
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->with('error', 'Gagal login dengan Google. Silakan coba lagi.');
        }

        // Check if user already exists with this Google ID
        $user = User::where('google_id', $googleUser->id)->first();

        if ($user) {
            // User exists, login them
            Auth::login($user, true);
            return redirect()->intended(route('dashboard'));
        }

        // Check if user exists with same email
        $existingUser = User::where('email', $googleUser->email)->first();

        if ($existingUser) {
            // Link Google account to existing user
            $existingUser->update([
                'google_id' => $googleUser->id,
                'avatar' => $googleUser->avatar,
            ]);
            Auth::login($existingUser, true);
            return redirect()->intended(route('dashboard'))->with('success', 'Akun Google berhasil ditautkan!');
        }

        // Create new user
        $newUser = User::create([
            'name' => $googleUser->name,
            'email' => $googleUser->email,
            'google_id' => $googleUser->id,
            'avatar' => $googleUser->avatar,
            'password' => bcrypt(''), // Empty password for Google users
            'email_verified_at' => now(),
        ]);

        event(new Registered($newUser));
        Auth::login($newUser, true);

        return redirect()->intended(route('dashboard'))->with('success', 'Akun berhasil dibuat dengan Google!');
    }
}
