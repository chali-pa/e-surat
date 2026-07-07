<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Surat extends Model
{
    protected $fillable = [
        'nomor_surat', 
        'tanggal_masuk', 
        'tanggal_buat', 
        'nama_pengirim', 
        'nama_surat', 
        'nama_file', 
        'file_path'
    ];
}