<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('surat.index');
        }
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|min:6',
        ]);

        $credentials = $request->only('email', 'password');
        $remember    = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();
            return redirect()->intended(route('surat.index'));
        }

        return back()->withErrors([
            'email' => 'Email atau password yang Anda masukkan salah.',
        ])->onlyInput('email');
    }

    public function showRegister()
    {
        if (Auth::check()) {
            return redirect()->route('surat.index');
        }
        return view('auth.register');
    }

    public function register(Request $request)
    {
        $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|min:6|confirmed',
            'password_confirmation' => 'required',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        Auth::login($user);
        return redirect()->route('surat.index')->with('success', 'Akun berhasil dibuat! Selamat datang di E-Surat.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login');
    }

    // Fungsi ini sekarang sudah berada di DALAM class AuthController
    public function logoutWithPassword(Request $request)
    {
        // 1. Validasi input
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = Auth::user();

        // 2. Cek kecocokan password yang diinput dengan password login (database)
        if (!Hash::check($request->password, $user->password)) {
            // Jika salah, kembalikan response error JSON
            return response()->json([
                'success' => false,
                'message' => 'Password yang kamu masukkan salah.'
            ], 422);
        }

        // 3. Jika password benar, jalankan proses logout
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // 4. Kirim response sukses beserta URL tujuan (Halaman Welcome)
        return response()->json([
            'success'  => true,
            'message'  => 'Kamu berhasil keluar dari akun.',
            'redirect' => url('/') // Arahkan ke halaman utama/welcome
        ]);
    }
} 