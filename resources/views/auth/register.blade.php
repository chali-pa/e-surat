<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daftar - E-Surat</title>
    <meta name="description" content="Buat akun E-Surat Anda untuk mengelola surat elektronik.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', sans-serif;
            height: 100vh;
            display: flex;
            overflow: hidden;
            background: #0d0015;
        }
        .form-panel {
            width: 45%;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 60px 56px;
            position: relative;
            z-index: 2;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 32px;
        }
        .logo-icon {
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #4B164C, #DD88CF);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            font-weight: 800;
            flex-shrink: 0;
        }
        .logo-text {
            font-size: 1.35rem;
            font-weight: 800;
            color: #1a1a2e;
            letter-spacing: -0.5px;
        }
        .welcome-heading {
            font-size: 1.75rem;
            font-weight: 800;
            color: #1a1a2e;
            margin-bottom: 6px;
            letter-spacing: -0.5px;
        }
        .welcome-sub {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 24px;
        }
        .tab-switcher {
            display: flex;
            background: #f3f4f6;
            border-radius: 10px;
            padding: 4px;
            margin-bottom: 24px;
            gap: 4px;
        }
        .tab-btn {
            flex: 1;
            padding: 9px 0;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            text-decoration: none;
            text-align: center;
            display: block;
            color: #6b7280;
            background: transparent;
        }
        .tab-btn.active {
            background: linear-gradient(135deg, #4B164C, #9c2fa0);
            color: white;
            box-shadow: 0 4px 12px rgba(75, 22, 76, 0.35);
        }
        .form-group { margin-bottom: 16px; }
        .form-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 7px;
            letter-spacing: 0.02em;
        }
        .input-wrapper { position: relative; }
        .form-input {
            width: 100%;
            padding: 12px 44px 12px 16px;
            border: 1.5px solid #e5e7eb;
            border-radius: 10px;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            color: #1a1a2e;
            background: #fafafa;
            outline: none;
            transition: all 0.2s ease;
        }
        .form-input:focus {
            border-color: #DD88CF;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(221, 136, 207, 0.18);
        }
        .input-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
            pointer-events: none;
            font-size: 1rem;
        }
        .input-icon.clickable {
            pointer-events: auto;
            cursor: pointer;
        }
        .error-box {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            color: #b91c1c;
            font-size: 0.82rem;
        }
        .error-box ul { padding-left: 18px; }
        .form-input.is-error { border-color: #f87171; }
        .btn-submit {
            width: 100%;
            padding: 13px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #4B164C, #a0359b);
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.02em;
            transition: all 0.25s ease;
            box-shadow: 0 4px 16px rgba(75, 22, 76, 0.4);
            margin-top: 6px;
        }
        .btn-submit:hover {
            background: linear-gradient(135deg, #3a1039, #8e2e89);
            box-shadow: 0 6px 20px rgba(75, 22, 76, 0.5);
            transform: translateY(-1px);
        }
        .footer-text {
            text-align: center;
            font-size: 0.83rem;
            color: #6b7280;
            margin-top: 20px;
        }
        .footer-text a {
            color: #9333ea;
            font-weight: 600;
            text-decoration: none;
            transition: color 0.2s;
        }
        .deco-panel {
            flex: 1;
            position: relative;
            overflow: hidden;
            background: linear-gradient(145deg, #0d0015 0%, #1a0020 40%, #4B164C 100%);
        }
        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.7;
            animation: floatBlob 10s ease-in-out infinite;
        }
        .blob-1 { width: 420px; height: 420px; background: radial-gradient(circle, #DD88CF, #9b3fa0); top: -80px; right: -60px; animation-delay: 0s; }
        .blob-2 { width: 350px; height: 350px; background: radial-gradient(circle, #4B164C, #7b1f7d); bottom: -60px; left: -40px; animation-delay: -4s; }
        .blob-3 { width: 260px; height: 260px; background: radial-gradient(circle, #f0a8e6, #c75cc9); top: 40%; left: 30%; animation-delay: -7s; }
        .blob-4 { width: 180px; height: 180px; background: radial-gradient(circle, #ffffff33, #DD88CF66); top: 20%; left: 10%; animation-delay: -2s; }
        @keyframes floatBlob { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-40px) scale(1.08); } 66% { transform: translate(-20px,30px) scale(0.95); } }
        .deco-svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.25; }
        .deco-card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 48px; text-align: center; z-index: 2; }
        .deco-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 999px; color: #f9d5f4; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 24px; }
        .deco-title { font-size: 2.4rem; font-weight: 800; color: #ffffff; line-height: 1.2; letter-spacing: -1px; margin-bottom: 16px; text-shadow: 0 4px 30px rgba(0,0,0,0.4); }
        .deco-title span { background: linear-gradient(90deg, #f9d5f4, #DD88CF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .deco-desc { font-size: 0.95rem; color: rgba(255,255,255,0.65); line-height: 1.7; max-width: 300px; }
        @media (max-width: 768px) {
            .deco-panel { display: none; }
            .form-panel { width: 100%; padding: 40px 28px; }
        }
    </style>
</head>
<body>
    <div class="form-panel">
        <div class="logo">
            <div class="logo-icon">✉</div>
            <span class="logo-text">E-Surat</span>
        </div>

        <h1 class="welcome-heading">Buat Akun Baru</h1>
        <p class="welcome-sub">Daftarkan akun Anda untuk mulai mengelola surat elektronik.</p>

        <div class="tab-switcher">
            <a href="{{ route('login') }}" class="tab-btn">Masuk</a>
            <a href="{{ route('register') }}" class="tab-btn active">Daftar</a>
        </div>

        @if ($errors->any())
            <div class="error-box">
                <ul>
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="{{ route('register') }}">
            @csrf
            <div class="form-group">
                <label for="name" class="form-label">Nama Lengkap</label>
                <div class="input-wrapper">
                    <input type="text" id="name" name="name" value="{{ old('name') }}" placeholder="Masukkan nama lengkap" class="form-input {{ $errors->has('name') ? 'is-error' : '' }}" required autofocus autocomplete="name">
                    <span class="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z" />
                            <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
                        </svg>
                    </span>
                </div>
            </div>

            <div class="form-group">
                <label for="email" class="form-label">Alamat Email</label>
                <div class="input-wrapper">
                    <input type="email" id="email" name="email" value="{{ old('email') }}" placeholder="nama@email.com" class="form-input {{ $errors->has('email') ? 'is-error' : '' }}" required autocomplete="username">
                    <span class="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <path d="M3 7l9 6 9-6" />
                            <path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7" />
                        </svg>
                    </span>
                </div>
            </div>

            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <div class="input-wrapper">
                    <input type="password" id="password" name="password" placeholder="Buat password" class="form-input {{ $errors->has('password') ? 'is-error' : '' }}" required autocomplete="new-password">
                    <span class="input-icon clickable" onclick="togglePassword('password', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <rect x="6" y="11" width="12" height="9" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                    </span>
                </div>
            </div>

            <div class="form-group">
                <label for="password_confirmation" class="form-label">Konfirmasi Password</label>
                <div class="input-wrapper">
                    <input type="password" id="password_confirmation" name="password_confirmation" placeholder="Ulangi password" class="form-input {{ $errors->has('password_confirmation') ? 'is-error' : '' }}" required autocomplete="new-password">
                    <span class="input-icon clickable" onclick="togglePassword('password_confirmation', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <rect x="6" y="11" width="12" height="9" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                    </span>
                </div>
            </div>

            <button type="submit" class="btn-submit">Daftar Sekarang</button>
        </form>

        <div class="footer-text">
            Sudah punya akun? <a href="{{ route('login') }}">Masuk di sini</a>
        </div>
    </div>

    <div class="deco-panel">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="blob blob-4"></div>
        <svg class="deco-svg" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <path d="M-50,200 Q150,50 300,300 T650,200" stroke="white" stroke-width="1.5" fill="none"/>
            <path d="M-50,350 Q200,150 400,450 T700,300" stroke="white" stroke-width="1" fill="none"/>
            <path d="M100,0 Q300,200 200,500 T400,800" stroke="#DD88CF" stroke-width="1.5" fill="none"/>
            <path d="M300,0 Q500,300 300,600 T500,800" stroke="#f0a8e6" stroke-width="1" fill="none"/>
            <path d="M0,500 Q200,350 400,600 T700,500" stroke="white" stroke-width="0.8" fill="none"/>
            <circle cx="150" cy="150" r="80" stroke="white" stroke-width="0.8" fill="none" opacity="0.5"/>
            <circle cx="450" cy="600" r="120" stroke="#DD88CF" stroke-width="0.8" fill="none" opacity="0.4"/>
            <circle cx="500" cy="200" r="50" stroke="white" stroke-width="0.5" fill="none" opacity="0.3"/>
        </svg>
        <div class="deco-card">
            <div class="deco-badge">✦ Sistem Manajemen Surat</div>
            <h2 class="deco-title">Buat akun<br><span>dan mulai kelola surat</span></h2>
            <p class="deco-desc">Platform digital yang membantu Anda mengelola dokumen penting dengan aman, cepat, dan terorganisir.</p>
        </div>
    </div>

    <script>
        function togglePassword(fieldId, iconEl) {
            const input = document.getElementById(fieldId);
            if (input.type === 'password') {
                input.type = 'text';
                iconEl.textContent = '🙈';
            } else {
                input.type = 'password';
                iconEl.textContent = '👁️';
            }
        }
    </script>
</body>
</html>