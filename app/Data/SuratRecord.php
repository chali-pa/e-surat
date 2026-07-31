<?php

namespace App\Data;

use Carbon\Carbon;

class SuratRecord
{
    public function __construct(
        public int $id,
        public string $nomor_surat,
        public string $tanggal_masuk,
        public string $tanggal_buat,
        public string $nama_pengirim,
        public string $nama_surat,
        public string $nama_file,
        public string $status = 'pending',
        public ?string $google_drive_file_id = null,
        public ?string $drive_link = null,
        public ?Carbon $created_at = null,
        public ?Carbon $updated_at = null,
    ) {}

    /**
     * @param  array<int, mixed>  $row
     */
    public static function fromSheetRow(array $row): ?self
    {
        if (! isset($row[0]) || $row[0] === '' || $row[0] === 'ID') {
            return null;
        }

        $id = (int) $row[0];

        if ($id <= 0) {
            return null;
        }

        $createdAt = self::parseDateTime($row[11] ?? $row[9] ?? null);
        $updatedAt = self::parseDateTime($row[9] ?? null);

        if ($createdAt === null) {
            $createdAt = self::parseDateTime($row[3] ?? null) ?? Carbon::now();
        }

        return new self(
            id: $id,
            nomor_surat: (string) ($row[1] ?? ''),
            tanggal_masuk: (string) ($row[2] ?? ''),
            tanggal_buat: (string) ($row[3] ?? ''),
            nama_pengirim: (string) ($row[4] ?? ''),
            nama_surat: (string) ($row[5] ?? ''),
            nama_file: (string) ($row[6] ?? ''),
            status: (string) ($row[7] ?? 'pending'),
            drive_link: isset($row[8]) && $row[8] !== '' ? (string) $row[8] : null,
            google_drive_file_id: isset($row[10]) && $row[10] !== '' ? (string) $row[10] : null,
            updated_at: $updatedAt,
            created_at: $createdAt,
        );
    }

    /**
     * @return array<int, mixed>
     */
    public function toSheetRow(?string $driveLink = null): array
    {
        $now = now()->format('Y-m-d H:i:s');
        $created = ($this->created_at ?? now())->format('Y-m-d H:i:s');
        $updated = ($this->updated_at ?? now())->format('Y-m-d H:i:s');
        $link = $driveLink ?? $this->drive_link ?? '';

        return [
            $this->id,
            $this->nomor_surat,
            $this->tanggal_masuk,
            $this->tanggal_buat,
            $this->nama_pengirim,
            $this->nama_surat,
            $this->nama_file,
            $this->status,
            $link,
            $updated,
            $this->google_drive_file_id ?? '',
            $created,
        ];
    }

    private static function parseDateTime(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
