<?php

use App\Data\SuratRecord;
use App\Models\User;
use App\Services\GoogleDriveService;
use App\Services\GoogleSheetService;
use Carbon\Carbon;

it('mengembalikan preview surat secara inline dari Google Drive', function () {
    $user = User::factory()->create();

    $surat = new SuratRecord(
        id: 1,
        nomor_surat: '001/2026',
        tanggal_masuk: now()->toDateString(),
        tanggal_buat: now()->toDateString(),
        nama_pengirim: 'PT Contoh',
        nama_surat: 'Contoh Surat',
        nama_file: 'test.pdf',
        google_drive_file_id: 'drive-file-123',
        created_at: Carbon::now(),
    );

    $this->mock(GoogleSheetService::class, function ($mock) use ($surat) {
        $mock->shouldReceive('find')->once()->with(1)->andReturn($surat);
    });

    $this->mock(GoogleDriveService::class, function ($mock) {
        $mock->shouldReceive('downloadContent')
            ->once()
            ->with('drive-file-123')
            ->andReturn([
                'content' => '%PDF-1.4\n%test',
                'mimeType' => 'application/pdf',
                'name' => 'test.pdf',
            ]);
    });

    $response = $this->actingAs($user)->get(route('surat.preview', $surat->id));

    $response->assertOk();
    $response->assertHeader('Content-Disposition', 'inline; filename="test.pdf"');
});
