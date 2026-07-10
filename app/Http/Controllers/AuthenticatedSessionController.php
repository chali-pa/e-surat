<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): View
    {
        return view('auth.login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Destroy an authenticated session only after the current password is confirmed.
     * Returns JSON when the request expects it (used by the AJAX logout modal),
     * otherwise falls back to a normal redirect with flashed session data.
     */
    public function destroyWithPassword(Request $request): RedirectResponse|JsonResponse
    {
        $wantsJson = $request->wantsJson() || $request->ajax();

        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = Auth::guard('web')->user();

        try {
            if (! $user || ! Hash::check($request->input('password'), $user->password)) {
                $message = 'Password yang Anda masukkan salah. Anda tidak bisa keluar dari akun.';

                if ($wantsJson) {
                    return response()->json(['success' => false, 'message' => $message], 422);
                }

                return back()->withErrors(['password' => $message]);
            }

            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $message = 'Anda berhasil keluar dari akun.';

            if ($wantsJson) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'redirect' => route('welcome'),
                ]);
            }

            return redirect()->route('welcome')->with('success', $message);
        } catch (\Throwable $e) {
            $message = 'Terjadi kesalahan saat mencoba keluar. Silakan coba lagi.';

            if ($wantsJson) {
                return response()->json(['success' => false, 'message' => $message], 500);
            }

            return back()->withErrors(['password' => $message]);
        }
    }
}
