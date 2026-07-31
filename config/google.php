<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Google OAuth
    |--------------------------------------------------------------------------
    |
    | Ambil Client ID & Client Secret dari:
    | Google Cloud Console > APIs & Services > Credentials > OAuth client ID
    | (Application type: Web application)
    |
    */
    'oauth' => [
        'client_id' => env('GOOGLE_OAUTH_CLIENT_ID'),
        'client_secret' => env('GOOGLE_OAUTH_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_OAUTH_REDIRECT_URI', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/') . '/google/callback'),
      // Token hasil login tersimpan di sini
        'token_path' => storage_path('app/google/token.json'),
    ],
    
        /*
    |--------------------------------------------------------------------------
    | Google Service Account
    |--------------------------------------------------------------------------
    |
    | Simpan credentials.json di storage/app/google/credentials.json
    | atau tentukan path lewat GOOGLE_APPLICATION_CREDENTIALS.
    |
    */
    'credentials' => storage_path('app/google/credentials.json'),

    /*
    |--------------------------------------------------------------------------
    | Google Drive – Folder E-Surat
    |--------------------------------------------------------------------------
    |
    | Folder root untuk semua file surat.
    | https://drive.google.com/drive/folders/1_ALwy_tpoUKr6nE654Gut2rB1A3bohbo
    |
    */
    'drive_folder_id' => env('GOOGLE_DRIVE_FOLDER_ID', '1_ALwy_tpoUKr6nE654Gut2rB1A3bohbo'),

    /*
    |--------------------------------------------------------------------------
    | Google Sheets – Data Surat
    |--------------------------------------------------------------------------
    |
    | https://docs.google.com/spreadsheets/d/1hMsN9xT11r9641kmEAbxIss1fbwvio43GTW8csmF8AA
    |
    */
    'sheet_id' => env('GOOGLE_SHEET_ID', '1hMsN9xT11r9641kmEAbxIss1fbwvio43GTW8csmF8AA'),

    'sheet_name' => env('GOOGLE_SHEET_NAME', 'Sheet1'),

    /*
    |--------------------------------------------------------------------------
    | Google Sheets – Data Surat Keluar
    |--------------------------------------------------------------------------
    |
    | Buat spreadsheet baru untuk surat keluar dan masukkan ID di sini
    |
    */
    'sheet_keluar_id' => env('GOOGLE_SHEET_KELUAR_ID', ''),
    'sheet_keluar_name' => env('GOOGLE_SHEET_KELUAR_NAME', 'Sheet1'),

    /*
    |--------------------------------------------------------------------------
    | Kategori Folder File
    |--------------------------------------------------------------------------
    */
    'file_categories' => [
        'foto' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
        'excel' => ['xls', 'xlsx', 'csv', 'ods'],
        'dokumen' => ['doc', 'docx', 'odt', 'rtf', 'txt', 'html'],
        'arsip' => ['zip', 'rar', 'epub'],
    ],

];
