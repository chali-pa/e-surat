<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        <link rel="icon" type="image/svg+xml" href="{{ asset('image/favicon-esurat.svg') }}">
    
    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
    <script>
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>
    <style>
        /* Dark Mode Overrides */
        .dark body { background-color: #0f172a !important; color: #f8fafc !important; }
        .dark #sidebar { background-color: #1e293b !important; border-color: #334155 !important; }
        .dark .bg-white { background-color: #1e293b !important; }
        .dark .bg-gray-50, .dark .bg-slate-50, .dark .bg-\[\#F4F6F9\], .dark .bg-\[\#F9FAFB\] { background-color: #0f172a !important; }
        .dark .text-gray-900, .dark .text-gray-800, .dark .text-\[\#1a1a2e\] { color: #f8fafc !important; }
        .dark .text-gray-600, .dark .text-gray-500, .dark .text-slate-500 { color: #94a3b8 !important; }
        .dark .border-gray-200, .dark .border-gray-100, .dark .border-slate-100, .dark .border-\[\#eaecf0\], .dark .border-\[\#e5e7eb\] { border-color: #334155 !important; }
        .dark header { background-color: #1e293b !important; border-color: #334155 !important; }
        
        /* Dashboard & Surat Specifics */
        .dark .card-shadow { box-shadow: 0 1px 8px rgba(0,0,0,0.5) !important; }
        .dark .day-header { background: #1e293b !important; color: #f8fafc !important; }
        .dark .day-group + .day-group { border-top-color: #0f172a !important; }
        .dark .hist-row:hover { background: #334155 !important; }
        .dark .hist-date-icon { background: #0f172a !important; color: #cbd5e1 !important; }
        .dark .transactions-card { background: #1e293b !important; border-color: #334155 !important; }
        .dark .table-toolbar { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        .dark .table-header { background: #0f172a !important; border-color: #334155 !important; }
        .dark .table-row:hover { background: #334155 !important; }
        .dark td, .dark th { border-color: #334155 !important; }
        .dark .table-pagination { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        .dark select { background-color: #0f172a !important; color: #f8fafc !important; border-color: #334155 !important; }
        
        /* Auth Specifics */
        .dark .form-panel { background-color: #1e293b !important; }
        .dark .form-input, .dark textarea { background-color: #0f172a !important; border-color: #334155 !important; color: #f8fafc !important; }
        .dark .form-input:focus, .dark textarea:focus { border-color: #DD88CF !important; }
        .dark .logo-text, .dark .welcome-heading { color: #f8fafc !important; }
        .dark .form-label { color: #cbd5e1 !important; }
        .dark .tab-switcher { background-color: #0f172a !important; }
        .dark .tab-btn { color: #94a3b8 !important; }
        .dark .tab-btn.active { color: #fff !important; }
        .dark .success-box, .dark .error-box { background-color: #0f172a !important; border-color: #334155 !important; }
        .dark .deco-desc { color: #cbd5e1 !important; }
    </style>
</head>
    <body class="font-sans antialiased">
        <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
            @include('layouts.navigation')

            <!-- Page Heading -->
            @isset($header)
                <header class="bg-white dark:bg-gray-800 shadow">
                    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        {{ $header }}
                    </div>
                </header>
            @endisset

            <!-- Page Content -->
            <main>
                {{ $slot }}
            </main>
        </div>
    </body>
</html>
