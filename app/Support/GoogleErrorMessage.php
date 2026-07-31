<?php

namespace App\Support;

class GoogleErrorMessage
{
    public static function fromThrowable(\Throwable $e): string
    {
        $message = $e->getMessage();

        if (str_contains($message, 'drive.googleapis.com')
            && (str_contains($message, 'SERVICE_DISABLED') || str_contains($message, 'accessNotConfigured'))) {
            return 'Google Drive API belum diaktifkan. Buka Google Cloud Console → APIs & Services → aktifkan "Google Drive API", tunggu 1–2 menit, lalu coba lagi.';
        }

        if (str_contains($message, 'sheets.googleapis.com')
            && (str_contains($message, 'SERVICE_DISABLED') || str_contains($message, 'accessNotConfigured'))) {
            return 'Google Sheets API belum diaktifkan. Buka Google Cloud Console → APIs & Services → aktifkan "Google Sheets API", tunggu 1–2 menit, lalu coba lagi.';
        }

        if (str_contains($message, 'storageQuotaExceeded')) {
            return 'Kuota penyimpanan Google Drive penuh.';
        }

        if (str_contains($message, '404') && str_contains($message, 'File not found')) {
            return 'Folder Google Drive tidak ditemukan. Periksa GOOGLE_DRIVE_FOLDER_ID di file .env.';
        }

        if (str_contains($message, '403') || str_contains($message, 'PERMISSION_DENIED')) {
            $email = self::serviceAccountEmail();

            return 'Service account belum punya akses. Share folder Drive & Spreadsheet ke email: '
                . ($email ?? 'client_email di credentials.json')
                . ' dengan role Editor.';
        }

        return 'Gagal menghubungi Google Drive/Sheets. Periksa credentials.json dan izin akses.';
    }

    public static function serviceAccountEmail(): ?string
    {
        $path = config('google.credentials');

        if (! is_string($path) || ! file_exists($path)) {
            return null;
        }

        $json = json_decode((string) file_get_contents($path), true);

        return is_array($json) ? ($json['client_email'] ?? null) : null;
    }
}
