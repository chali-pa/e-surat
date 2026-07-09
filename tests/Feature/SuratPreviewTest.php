<?php

use App\Models\Surat;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

it('mengembalikan preview surat secara inline', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $path = 'surat/test.pdf';
    Storage::disk('public')->put($path, '%PDF-1.4\n%test');

    $surat = Surat::create([
        'nomor_surat' => '001/2026',
        'tanggal_masuk' => now()->toDateString(),
        'tanggal_buat' => now()->toDateString(),
        'nama_pengirim' => 'PT Contoh',
        'nama_surat' => 'Contoh Surat',
        'nama_file' => 'test.pdf',
        'file_path' => $path,
    ]);

    $response = $this->actingAs($user)->get(route('surat.preview', $surat->id));

    $response->assertOk();
    $response->assertHeader('Content-Disposition', 'inline; filename="test.pdf"');
});
