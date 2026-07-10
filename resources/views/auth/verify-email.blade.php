<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Email - E-Surat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; height: 100vh; display: flex; overflow: hidden; background: #0d0015; }
        .form-panel { width: 45%; background: #ffffff; display: flex; flex-direction: column; justify-content: center; padding: 60px 56px; position: relative; z-index: 2; overflow-y: auto; }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .logo-icon { width: 38px; height: 38px; background: linear-gradient(135deg, #4B164C, #DD88CF); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 800; flex-shrink: 0; }
        .logo-text { font-size: 1.35rem; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
        .welcome-heading { font-size: 1.75rem; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; letter-spacing: -0.5px; }
        .welcome-sub { font-size: 0.875rem; color: #6b7280; margin-bottom: 32px; line-height: 1.6; }
        .success-box { background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; color: #047857; font-size: 0.82rem; }
        .btn-submit { width: 100%; padding: 13px; border: none; border-radius: 10px; background: linear-gradient(135deg, #4B164C, #a0359b); color: white; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 4px 16px rgba(75, 22, 76, 0.4); margin-bottom: 12px; }
        .btn-submit:hover { background: linear-gradient(135deg, #3a1039, #8e2e89); transform: translateY(-1px); }
        .btn-outline { width: 100%; padding: 13px; border: 1.5px solid #e5e7eb; border-radius: 10px; background: transparent; color: #6b7280; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .btn-outline:hover { background: #f9fafb; color: #374151; border-color: #d1d5db; }
        .action-buttons { display: flex; flex-direction: column; gap: 10px; }
        .deco-panel { flex: 1; position: relative; overflow: hidden; background: linear-gradient(145deg, #0d0015 0%, #1a0020 40%, #4B164C 100%); }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.7; animation: floatBlob 10s ease-in-out infinite; }
        .blob-1 { width: 420px; height: 420px; background: radial-gradient(circle, #DD88CF, #9b3fa0); top: -80px; right: -60px; animation-delay: 0s; }
        .blob-2 { width: 350px; height: 350px; background: radial-gradient(circle, #4B164C, #7b1f7d); bottom: -60px; left: -40px; animation-delay: -4s; }
        .blob-3 { width: 260px; height: 260px; background: radial-gradient(circle, #f0a8e6, #c75cc9); top: 40%; left: 30%; animation-delay: -7s; }
        .blob-4 { width: 180px; height: 180px; background: radial-gradient(circle, #ffffff33, #DD88CF66); top: 20%; left: 10%; animation-delay: -2s; }
        @keyframes floatBlob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -40px) scale(1.08); } 66% { transform: translate(-20px, 30px) scale(0.95); } }
        .deco-svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.25; }
        .deco-card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 48px; text-align: center; z-index: 2; }
        .deco-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 999px; color: #f9d5f4; font-size: 0.8rem; font-weight: 600; margin-bottom: 24px; }
        .deco-title { font-size: 2.4rem; font-weight: 800; color: #ffffff; line-height: 1.2; letter-spacing: -1px; margin-bottom: 16px; text-shadow: 0 4px 30px rgba(0,0,0,0.4); }
        .deco-title span { color: #f9d5f4; font-weight: 800; }
        .deco-desc { font-size: 0.95rem; color: rgba(255,255,255,0.65); line-height: 1.7; max-width: 300px; }
        @media (max-width: 768px) { .deco-panel { display: none; } .form-panel { width: 100%; padding: 40px 28px; } }
    </style>
</head>
<body>
    <div class="form-panel">
        <div class="logo">
            <div class="logo-icon">✉</div>
            <span class="logo-text">E-Surat</span>
        </div>
        <h1 class="welcome-heading">Verifikasi Email Anda</h1>
        <p class="welcome-sub">Terima kasih telah mendaftar! Sebelum memulai, bisakah Anda memverifikasi alamat email Anda dengan mengeklik tautan yang baru saja kami kirimkan? Jika Anda tidak menerima emailnya, kami akan dengan senang hati mengirimkan yang baru.</p>

        @if (session('status') == 'verification-link-sent')
            <div class="success-box">
                Tautan verifikasi baru telah dikirimkan ke alamat email yang Anda berikan saat pendaftaran.
            </div>
        @endif

        <div class="action-buttons">
            <form method="POST" action="{{ route('verification.send') }}" style="width: 100%;">
                @csrf
                <button type="submit" class="btn-submit">Kirim Ulang Email Verifikasi</button>
            </form>

            <form method="POST" action="{{ route('logout') }}" style="width: 100%;">
                @csrf
                <button type="submit" class="btn-outline">Keluar dari Akun</button>
            </form>
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
        </svg>
        <div class="deco-card">
            <div class="deco-badge">✦ E-Surat</div>
            <h2 class="deco-title">Langkah<br><span>Terakhir</span></h2>
            <p class="deco-desc">Verifikasi email Anda untuk memastikan keamanan dan mengaktifkan semua fitur E-Surat.</p>
        </div>
    </div>
</body>
</html>
