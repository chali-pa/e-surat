<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): View
    {
        return view('auth.forgot-password');
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'g-recaptcha-response' => ['required', new \App\Rules\ReCaptchaRule()],
        ], [
            'email.exists' => 'Email tidak terdaftar di sistem kami.'
        ]);

        $otp = (string) random_int(100000, 999999);
        $user = User::where('email', $request->email)->first();

        session([
            'otp_login_code' => $otp,
            'otp_login_email' => $request->email,
            'otp_expires_at' => now()->addMinutes(2),
        ]);

        Mail::to($request->email)->send(new OtpMail($otp, $user->name));

        return redirect()->route('otp.verify')->with('status', 'Kode verifikasi 6 angka telah dikirim ke email Anda.');
    }

    public function verifyOtp(): View|RedirectResponse
    {
        if (!session('otp_login_email') || !session('otp_expires_at')) {
            return redirect()->route('password.request');
        }

        $expiresAt = \Carbon\Carbon::parse(session('otp_expires_at'));
        $remainingSeconds = now()->diffInSeconds($expiresAt, false);

        if ($remainingSeconds <= 0) {
            session()->forget(['otp_login_code', 'otp_login_email', 'otp_expires_at']);
            return redirect()->route('password.request')->withErrors(['email' => 'Kode OTP telah kadaluarsa. Silakan minta kode baru.']);
        }

        return view('auth.verify-otp', compact('remainingSeconds'));
    }

    public function processOtp(Request $request): RedirectResponse
    {
        $request->validate([
            'otp' => 'required|string|size:6',
        ]);

        if (now()->greaterThan(session('otp_expires_at'))) {
            session()->forget(['otp_login_code', 'otp_login_email', 'otp_expires_at']);
            return redirect()->route('password.request')->withErrors(['email' => 'Kode OTP telah kadaluarsa. Silakan minta kode baru.']);
        }

        if ($request->otp !== session('otp_login_code')) {
            return back()->withErrors(['otp' => 'Kode OTP tidak valid atau salah.']);
        }

        $user = User::where('email', session('otp_login_email'))->first();

        if ($user) {
            Auth::login($user);
            session()->forget(['otp_login_code', 'otp_login_email', 'otp_expires_at']);
            session()->regenerate();
            return redirect()->intended(route('dashboard', absolute: false));
        }

        return redirect()->route('login')->withErrors(['email' => 'Terjadi kesalahan, pengguna tidak ditemukan.']);
    }
}
