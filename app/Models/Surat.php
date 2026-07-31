<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @deprecated Data surat sekarang disimpan di Google Sheets.
 *             Model ini tidak lagi dipakai oleh aplikasi.
 */
class Surat extends Model
{
    protected $fillable = [
        'nomor_surat',
        'tanggal_masuk',
        'tanggal_buat',
        'nama_pengirim',
        'nama_surat',
        'nama_file',
        'file_path',
        'google_drive_file_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_masuk' => 'date',
            'tanggal_buat' => 'date',
        ];
    }
}
