<?php

namespace Tests\Feature;

use App\Data\SuratRecord;
use App\Models\User;
use App\Services\GoogleSheetService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_surat_index_page_renders(): void
    {
        $surat = new SuratRecord(
            id: 1,
            nomor_surat: 'SRT-001',
            tanggal_masuk: '2026-07-02',
            tanggal_buat: '2026-07-02',
            nama_pengirim: 'Admin',
            nama_surat: 'Contoh Surat',
            nama_file: 'contoh.pdf',
            google_drive_file_id: 'drive-file-1',
            created_at: Carbon::parse('2026-07-02 10:00:00'),
        );

        $this->mock(GoogleSheetService::class, function ($mock) use ($surat) {
            $mock->shouldReceive('all')->once()->andReturn(collect([$surat]));
        });

        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('surat.index'));

        $response->assertStatus(200);
        $response->assertSee('Daftar Surat');
        $response->assertSee('SRT-001');
    }
}
