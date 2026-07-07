<?php

namespace Tests\Feature;

use App\Models\Surat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_surat_index_page_renders(): void
    {
        Surat::create([
            'nomor_surat' => 'SRT-001',
            'tanggal_masuk' => '2026-07-02',
            'tanggal_buat' => '2026-07-02',
            'nama_pengirim' => 'Admin',
            'nama_surat' => 'Contoh Surat',
            'nama_file' => 'contoh.pdf',
            'file_path' => 'surat/contoh.pdf',
        ]);

        $response = $this->get(route('surat.index'));

        $response->assertStatus(200);
        $response->assertSee('Daftar Surat');
    }
}
