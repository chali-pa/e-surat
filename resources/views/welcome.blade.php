<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{{ config('app.name', 'E-Surat') }} — Sistem Manajemen Surat</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --purple-deep: #7A2D7C;
    --pink-light: #DD88CF;
    --purple-mid: #A24BA0;
    --ink: #2B1730;
    --ink-soft: #6B5570;
    --paper: #FBF7FB;
    --card: #FFFFFF;
    --line: #EADCE9;
  }
  
  html.dark {
    --purple-deep: #FCE4FA;
    --pink-light: #A24BA0;
    --purple-mid: #D57BC6;
    --ink: #f8fafc;
    --ink-soft: #cbd5e1;
    --paper: #0f172a;
    --card: #1e293b;
    --line: #334155;
  }

  *{ box-sizing: border-box; }
  html{ scroll-behavior: smooth; }
  body{
    margin:0;
    background: var(--paper);
    color: var(--ink);
    font-family: 'Poppins', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  img, svg{ max-width:100%; }
  .wrap{
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 clamp(18px, 5vw, 32px);
  }

  /* ---------- header ---------- */
  header{ position: absolute; top:0; left:0; right:0; z-index: 50; }
  .header-inner{
    display:flex; align-items:center; justify-content:space-between;
    gap: 12px;
    padding: clamp(16px, 4vw, 26px) 0;
  }
  nav{ display:flex; align-items:center; gap: clamp(8px, 2vw, 14px); flex-shrink:0; }

  /* HEADER */

  header{
      position:absolute;
      top:0;
      left:0;
      right:0;
      z-index:100;
  }

  .header-inner{
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:22px 0;
  }

  .logo-text{
      text-decoration:none;
      color:#2b1730;
      font-size:clamp(22px, 4vw, 30px);
      font-weight:700;
  }

  nav{
      display:flex;
      gap:18px;
  }

  .header-btn{

      min-width: clamp(70px, 8vw, 95px);

      text-align:center;

      padding: clamp(8px, 2vw, 12px) clamp(16px, 4vw, 28px);

      border-radius:12px;

      background:rgba(87,36,95,.25);

      color:white;

      text-decoration:none;

      font-weight:500;

      border:1px solid rgba(255,255,255,.15);

      backdrop-filter:blur(12px);

      transition:.25s;
  }

  .header-btn:hover{

      background:rgba(255,255,255,.18);

      transform:translateY(-2px);

      box-shadow:0 10px 20px rgba(0,0,0,.15);

  }

  /* ---------- hero ---------- */
  .hero{
    padding:150px 0 120px;
    position: relative;
    background:linear-gradient(90deg, #D57BC6 0%, #B14FB2 45%, #742B88 100%);
    overflow: hidden;
  }
  .hero::after{
    content:"";
    position:absolute; inset:0;
    background: radial-gradient(60% 50% at 85% 80%, rgba(255,255,255,.12), transparent 70%);
    pointer-events:none;
  }
  .hero-grid{
    position: relative; z-index: 2;
    display:grid; grid-template-columns: 1.05fr .95fr; gap: clamp(32px, 6vw, 56px); align-items:center;
  }
  .eyebrow{
    display:inline-flex; align-items:center; gap:8px;
    font-size: 12px; letter-spacing:.08em; text-transform: uppercase;
    color: #fff;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.4);
    padding: 7px 14px; border-radius: 999px;
    margin-bottom: clamp(16px, 3vw, 24px);
    font-weight: 500;
  }
  .hero-title{
    font-size: clamp(32px, 4.5vw, 52px);
    font-weight:700;
    line-height:1.1;
    letter-spacing: -.01em;
    margin: 0 0 clamp(14px, 3vw, 22px);
    color: #fff;
  }
  .hero-title em{ font-style: normal; color: #FCE4FA; }
  .lede{
    font-size: clamp(14.5px, 2.6vw, 16.5px);
    font-weight: 300;
    line-height: 1.7;
    color: rgba(255,255,255,.88);
    max-width: 460px;
    margin: 0 0 clamp(24px, 5vw, 36px);
  }
  .cta-row{ display:flex; align-items:center; gap: clamp(10px, 3vw, 16px); flex-wrap:wrap; }
  .btn-primary{
    display:inline-flex; align-items:center; gap:10px;
    background: #fff;
    color: #7A2D7C;
    font-weight:600; font-size: clamp(14px, 3vw, 15px);
    padding: clamp(13px, 3vw, 15px) clamp(20px, 5vw, 28px);
    border-radius: 999px;
    text-decoration:none;
    transition: transform .15s ease, background .15s ease;
    white-space:nowrap;
  }
  .btn-primary:hover{ background: #F6E9F5; transform: translateY(-1px); }
  .btn-secondary{
    display:inline-flex; align-items:center; gap:8px;
    color: #fff;
    font-weight:500; font-size: clamp(14px, 3vw, 15px);
    padding: clamp(13px, 3vw, 15px) 6px;
    text-decoration:none;
    border-bottom: 1.5px solid rgba(255,255,255,.6);
    white-space:nowrap;
  }
  .btn-secondary:hover{ border-color: #fff; }

  /* ---------- hero illustration ---------- */
  .hero-art{ position:relative; height: clamp(220px, 42vw, 360px); max-width: 420px; margin: 0 auto; width:100%; }
  .letter-card{
    position:absolute;
    width: 78%;
    background: var(--card);
    border-radius: 14px;
    box-shadow: 0 20px 50px rgba(58,17,60,.35);
    padding: clamp(14px, 3vw, 22px) clamp(16px, 3.5vw, 24px);
  }
  .letter-card .ref{
    font-size: clamp(10px, 2vw, 11px); color: var(--ink-soft);
    letter-spacing:.03em; margin-bottom: 10px; font-weight:500;
  }
  .letter-card .rule{ height:8px; border-radius:4px; background: var(--line); margin: 10px 0; }
  .letter-card .rule.short{ width: 55%; }
  .card-back{ top: 0; left: 10%; transform: rotate(-6deg); opacity:.75; height: 52%; }
  .card-mid{ top: 9%; left: 2%; transform: rotate(3deg); opacity: .92; height: 55%; }
  .card-front{ top: 20%; left: 8%; height: 58%; z-index:3; }
  .card-front .tag{
    display:inline-block; font-size: 11px; font-weight:600;
    background: rgba(122,45,124,.1); color: #7A2D7C;
    padding: 5px 12px; border-radius: 999px; margin-top: 12px;
  }
  .stamp-badge{
    position:absolute; right: 2%; bottom: 2%;
    width: clamp(80px, 18vw, 118px); height: clamp(80px, 18vw, 118px); z-index: 4;
    transform: rotate(-11deg);
    filter: drop-shadow(0 10px 20px rgba(58,17,60,.35));
  }

  /* ---------- registry strip ---------- */
  .strip{ background: var(--card); border-bottom: 1px solid var(--line); padding: 14px 0; }
  .strip-track{
    display:flex; gap: clamp(24px, 5vw, 48px);
    font-size: 12.5px; font-weight:400; color: var(--ink-soft);
    white-space: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .strip-track::-webkit-scrollbar{ display:none; }
  .strip-track b{ color: var(--purple-deep); font-weight:600; }

  /* ---------- features ---------- */
  .features{ padding: clamp(64px, 12vw, 100px) 0 clamp(56px, 10vw, 96px); }
  .section-head{ margin-bottom: clamp(32px, 6vw, 52px); max-width: 560px; }
  .section-eyebrow{
    font-size:12px; letter-spacing:.08em; font-weight:600;
    text-transform:uppercase; color: var(--purple-deep); margin-bottom:12px;
  }
  .section-head h2{
    font-weight:600;
    font-size: clamp(24px, 4.5vw, 32px); margin:0;
    line-height:1.3; color: var(--ink);
  }

  .ledger{ display:grid; grid-template-columns: repeat(2, 1fr); gap: clamp(16px, 3vw, 24px); }
  .row{
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: clamp(24px, 4vw, 32px) clamp(20px, 4vw, 26px);
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .row:hover{ transform: translateY(-4px); box-shadow: 0 16px 32px rgba(122,45,124,.12); }
  .row-no{
    display:inline-flex; align-items:center; justify-content:center;
    width: 36px; height:36px; border-radius: 50%;
    background: linear-gradient(135deg, #DD88CF, #7A2D7C);
    font-size: 13px; color: #fff; font-weight:600;
    margin-bottom: 18px;
  }
  .row-title{ font-weight:600; font-size: clamp(17px, 2.6vw, 19px); margin-bottom:10px; }
  .row-desc{ color: var(--ink-soft); font-size: 14.5px; font-weight:300; line-height:1.7; }

  /* ---------- closing banner ---------- */
  .closing{
    position: relative;
    background: radial-gradient(120% 140% at 80% 20%, #DD88CF 0%, #A24BA0 45%, #7A2D7C 100%);
    color: #fff;
    padding: clamp(40px, 8vw, 80px) 0;
    margin: 10px clamp(16px, 4vw, 0px) 40px;
    border-radius: clamp(18px, 3vw, 32px);
    max-width: 1180px;
    margin-left: auto; margin-right: auto;
  }
  .closing-inner{
    padding: 0 clamp(24px, 6vw, 48px);
    display:flex; align-items:center; justify-content:space-between; gap: clamp(20px, 4vw, 32px); flex-wrap:wrap;
  }
  .closing h3{ font-weight:600; font-size: clamp(22px, 4vw, 28px); margin: 0 0 10px; max-width: 460px; }
  .closing p{ color: rgba(255,255,255,.85); margin:0; max-width:420px; font-size:14.5px; font-weight:300; line-height:1.7; }
  .btn-light{
    display:inline-flex; align-items:center; gap:10px;
    background: #fff;
    color: #7A2D7C;
    font-weight:600; font-size: 15px;
    padding: 14px clamp(20px, 5vw, 28px);
    border-radius: 999px;
    text-decoration:none;
    white-space:nowrap;
  }
  .btn-light:hover{ background: #F6E9F5; }

  /* ---------- footer ---------- */
  footer{ padding: 26px 0 40px; background: var(--paper); }
  .footer-inner{
    display:flex; align-items:center; justify-content:space-between;
    flex-wrap:wrap; gap: 8px;
    color: var(--ink-soft); font-size: 12.5px; font-weight:300;
    text-align:center;
  }
  .footer-inner .logo-word{ color: var(--ink); font-size:clamp(15px, 2vw, 18px); font-weight:600; }

  /* ---------- responsive breakpoints ---------- */
  @media (max-width: 860px){
    .hero-grid{ grid-template-columns: 1fr; text-align:left; }
    .hero-art{ margin-top: 8px; }
  }
  @media (max-width: 560px){
    .header-inner{ flex-wrap:nowrap; }
    .lede{ max-width: 100%; }
    .cta-row{ width:100%; }
    .btn-primary, .btn-secondary{ flex: 0 1 auto; }
    .closing{ margin-left: 16px; margin-right: 16px; }
    .closing-inner{ flex-direction:column; align-items:flex-start; text-align:left; }
    .btn-light{ width:100%; justify-content:center; }
    .footer-inner{ flex-direction:column; text-align:center; }
  }
  @media (max-width: 380px){
    .logo-word{ font-size:clamp(16px, 3vw, 22px); font-weight: 700; }
    .glass-btn{ padding: 8px 14px; font-size:12px; }
    .stamp-badge{ display:none; }
  }
</style>
    <link rel="icon" type="image/svg+xml" href="{{ asset('image/favicon-esurat.svg') }}">
</head>
<body>

<header>
    <style>
        .logo-img-light { height: clamp(3rem, 6vw, 4.5rem); width: auto; display: block; transition: all 0.3s ease; }
        .logo-img-dark { height: clamp(3rem, 6vw, 4.5rem); width: auto; display: none; transition: all 0.3s ease; }
        html.dark .logo-img-light { display: none !important; }
        html.dark .logo-img-dark { display: block !important; }
    </style>
    <div class="wrap header-inner">

        <a href="/" class="logo-text" style="display: flex; align-items: center; text-decoration: none;">
            <img src="{{ asset('image/logo-esurat-light.svg') }}" alt="E-Surat" class="logo-img-light">
            <img src="{{ asset('image/logo-esurat-dark.svg') }}" alt="E-Surat" class="logo-img-dark">
        </a>

        <nav>
            @if (Route::has('login'))
                @auth
                    <a href="{{ url('/dashboard') }}" class="header-btn">
                        Dashboard
                    </a>
                @else
                    <a href="{{ route('login') }}" class="header-btn">
                        Masuk
                    </a>

                    @if (Route::has('register'))
                        <a href="{{ route('register') }}" class="header-btn">
                            Daftar
                        </a>
                    @endif
                @endauth
            @endif
        </nav>

    </div>
</header>

<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <div class="eyebrow">✉ Sistem Manajemen Surat</div>
      <h1 class="hero-title">Urus surat jauh<br>lebih mudah.</h1>
      <p class="lede">Satu tempat untuk mencatat, mengunggah, dan memantau status setiap surat — dari belum direspon sampai selesai. Nggak perlu lagi bolak-balik buku agenda atau kehilangan berkas penting.</p>
      <div class="cta-row">
        <a class="btn-primary" href="{{ auth()->check() ? url('/dashboard') : (Route::has('login') ? route('login') : '#') }}">Masuk ke Dashboard →</a>
        <a class="btn-secondary" href="#cara-kerja">Lihat cara kerja</a>
      </div>
    </div>

    <div class="hero-art">
      <div class="letter-card card-back"></div>
      <div class="letter-card card-mid"></div>
      <div class="letter-card card-front">
        <div class="ref">No. 005/ST/VII/2026</div>
        <div class="rule"></div>
        <div class="rule"></div>
        <div class="rule short"></div>
        <span class="tag">Lihat surat</span>
      </div>
      <svg class="stamp-badge" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
        <circle cx="70" cy="70" r="64" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.95"/>
        <circle cx="70" cy="70" r="53" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.8"/>
        <path id="curveTop" d="M 18 70 A 52 52 0 0 1 122 70" fill="none"/>
        <text font-family="Poppins, sans-serif" font-size="11" fill="#ffffff" letter-spacing="2" opacity="0.95">
          <textPath href="#curveTop" startOffset="50%" text-anchor="middle">TERCATAT · RESMI</textPath>
        </text>
        <text x="70" y="78" font-family="Poppins, sans-serif" font-weight="700" font-size="24" fill="#ffffff" text-anchor="middle">OK</text>
      </svg>
    </div>
  </div>
</section>

<section class="features" id="fitur">
  <div class="wrap">
    <div class="section-head">
      <div class="section-eyebrow">Fitur utama</div>
      <h2>Semua yang kamu butuhkan untuk urus surat, dalam satu tempat.</h2>
    </div>

    <div class="ledger">
      <div class="row">
        <div class="row-no">01</div>
        <div class="row-title">Catat surat dalam sekejap</div>
        <div class="row-desc">Isi nomor surat, tanggal surat dibuat, tanggal diterima, dan nama pengirim lewat satu form sederhana — siapa pun bisa langsung pakai tanpa perlu pelatihan khusus.</div>
      </div>
      <div class="row" id="cara-kerja">
        <div class="row-no">02</div>
        <div class="row-title">Simpan berkas asli dengan aman</div>
        <div class="row-desc">Unggah file surat (PDF, JPG, PNG, DOC, atau DOCX hingga 100MB) langsung dari HP atau komputer — tidak ada lagi berkas fisik yang hilang atau tercecer.</div>
      </div>
      <div class="row">
        <div class="row-no">03</div>
        <div class="row-title">Temukan surat apa pun dalam hitungan detik</div>
        <div class="row-desc">Cukup ketik nomor, nama pengirim, atau perihal surat untuk langsung menemukannya, lalu lihat, cetak, atau bagikan sesuai kebutuhan.</div>
      </div>
    </div>
  </div>
</section>

<section class="closing">
  <div class="closing-inner">
    <div>
      <h3>Selamat datang kembali.</h3>
      <p>Yuk, mulai kelola surat hari ini dengan lebih rapi dan efisien.</p>
    </div>
    <a class="btn-light" href="{{ auth()->check() ? url('/dashboard') : (Route::has('login') ? route('login') : '#') }}">Masuk ke Dashboard →</a>
  </div>
</section>

<footer>
  <div class="wrap footer-inner">
    <div class="logo-word" style="display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
        <img src="{{ asset('image/logo-esurat-light.svg') }}" alt="E-Surat" class="logo-img-light">
        <img src="{{ asset('image/logo-esurat-dark.svg') }}" alt="E-Surat" class="logo-img-dark">
    </div>
    <div>© {{ date('Y') }} · Sistem Manajemen Surat</div>
  </div>
</footer>

@include('profile.partials.toast')
@if (session('success'))
<script>
    document.addEventListener('DOMContentLoaded', function () {
        showToast(@json(session('success')), 'success');
    });
</script>
@endif

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const storedToast = sessionStorage.getItem('logoutToast');
        if (storedToast) {
            showToast(storedToast, 'success');
            sessionStorage.removeItem('logoutToast');
        }
    });
</script>

<script>
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
</script>

@include('partials.security')
</body>
</html>