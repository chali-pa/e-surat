<?php

namespace App\Services;

use App\Data\SuratRecord;
use Google\Service\Sheets;
use Google\Service\Sheets\BatchUpdateSpreadsheetRequest;
use Google\Service\Sheets\DeleteDimensionRequest;
use Google\Service\Sheets\DimensionRange;
use Google\Service\Sheets\Request as SheetsRequest;
use Google\Service\Sheets\ValueRange;
use Google\Service\Sheets\RepeatCellRequest;
use Google\Service\Sheets\CellData;
use Google\Service\Sheets\TextFormat;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class GoogleSheetService
{
    private ?Sheets $sheets = null;

    private bool $headersEnsured = false;

    /** @var array<int, SuratRecord>|null */
    private ?array $cachedRows = null;

    private ?\App\Models\User $user = null;

    public function __construct(
        private readonly GoogleClientFactory $googleClientFactory,
    ) {}

    public function setUser(?\App\Models\User $user): void
    {
        $this->user = $user;
        if ($user && $user->getGoogleToken()) {
            $this->googleClientFactory->setUserToken($user->getGoogleToken());
        }
    }

    private function getSheetId(): string
    {
        // Use user's sheet ID if available, otherwise fall back to global config
        return $this->user && $this->user->google_sheet_id 
            ? $this->user->google_sheet_id 
            : (string) config('google.sheet_id');
    }

    private function getSheetName(): string
    {
        return $this->user && $this->user->google_sheet_id 
            ? 'Sheet1' // Default sheet name for user-specific sheets
            : config('google.sheet_name', 'Sheet1');
    }

    public function isConfigured(): bool
    {
        return $this->googleClientFactory->isConfigured();
    }

    /**
     * @return Collection<int, SuratRecord>
     */
    public function all(): Collection
    {
        return collect($this->loadRows())
            ->sortByDesc(fn (SuratRecord $surat) => $surat->created_at?->timestamp ?? 0)
            ->values();
    }

    /**
     * @return Collection<int, SuratRecord>
     */
    public function search(string $query): Collection
    {
        $needle = mb_strtolower(trim($query));

        if ($needle === '') {
            return $this->all();
        }

        return $this->all()->filter(function (SuratRecord $surat) use ($needle) {
            $haystack = mb_strtolower(implode(' ', [
                $surat->nomor_surat,
                $surat->nama_surat,
                $surat->nama_pengirim,
                $surat->nama_file,
                $surat->status,
            ]));

            return str_contains($haystack, $needle);
        })->values();
    }

    public function find(int $id): ?SuratRecord
    {
        foreach ($this->loadRows() as $surat) {
            if ($surat->id === $id) {
                return $surat;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function insert(array $data, ?string $driveFileId = null, ?string $driveLink = null): SuratRecord
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('Google Sheets belum dikonfigurasi.');
        }

        $this->ensureHeaders();

        $now = now();
        $surat = new SuratRecord(
            id: $this->nextId(),
            nomor_surat: (string) ($data['nomor_surat'] ?? ''),
            tanggal_masuk: (string) ($data['tanggal_masuk'] ?? ''),
            tanggal_buat: (string) ($data['tanggal_buat'] ?? ''),
            nama_pengirim: (string) ($data['nama_pengirim'] ?? ''),
            nama_surat: (string) ($data['nama_surat'] ?? ''),
            nama_file: (string) ($data['nama_file'] ?? ''),
            status: (string) ($data['status'] ?? 'pending'),
            google_drive_file_id: $driveFileId,
            drive_link: $driveLink,
            created_at: $now,
            updated_at: $now,
        );

        $body = new ValueRange([
            'values' => [$surat->toSheetRow($driveLink)],
        ]);

        $appendResponse = $this->service()->spreadsheets_values->append(
            $this->getSheetId(),
            $this->range('A:L'),
            $body,
            ['valueInputOption' => 'USER_ENTERED', 'insertDataOption' => 'INSERT_ROWS']
        );

        // Apply normal text formatting to the newly appended row
        $updatedRange = $appendResponse->getUpdates()->getUpdatedRange();
        if (preg_match('/!A(\d+):L/', $updatedRange, $matches)) {
            $newRowNumber = (int) $matches[1];
            $this->applyRowFormatting($newRowNumber);
        }

        $this->invalidateCache();

        return $surat;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data, ?string $driveFileId = null, ?string $driveLink = null): ?SuratRecord
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('Google Sheets belum dikonfigurasi.');
        }

        $existing = $this->find($id);

        if ($existing === null) {
            return null;
        }

        $rowNumber = $this->findRowNumberById($id);

        if ($rowNumber === null) {
            return null;
        }

        $updated = new SuratRecord(
            id: $existing->id,
            nomor_surat: (string) ($data['nomor_surat'] ?? $existing->nomor_surat),
            tanggal_masuk: (string) ($data['tanggal_masuk'] ?? $existing->tanggal_masuk),
            tanggal_buat: (string) ($data['tanggal_buat'] ?? $existing->tanggal_buat),
            nama_pengirim: (string) ($data['nama_pengirim'] ?? $existing->nama_pengirim),
            nama_surat: (string) ($data['nama_surat'] ?? $existing->nama_surat),
            nama_file: (string) ($data['nama_file'] ?? $existing->nama_file),
            status: (string) ($data['status'] ?? $existing->status),
            google_drive_file_id: $driveFileId ?? $existing->google_drive_file_id,
            drive_link: $driveLink ?? $existing->drive_link,
            created_at: $existing->created_at,
            updated_at: now(),
        );

        $body = new ValueRange([
            'values' => [$updated->toSheetRow($driveLink ?? $updated->drive_link)],
        ]);

        $this->service()->spreadsheets_values->update(
            $this->getSheetId(),
            $this->range("A{$rowNumber}:L{$rowNumber}"),
            $body,
            ['valueInputOption' => 'USER_ENTERED']
        );

        // Apply normal text formatting to the updated row
        $this->applyRowFormatting($rowNumber);

        $this->invalidateCache();

        return $updated;
    }

    public function delete(int $id): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $rowNumber = $this->findRowNumberById($id);

            if ($rowNumber === null) {
                return true;
            }

            $sheetId = $this->getSheetNumericId();

            $deleteRequest = new DeleteDimensionRequest([
                'range' => new DimensionRange([
                    'sheetId' => $sheetId,
                    'dimension' => 'ROWS',
                    'startIndex' => $rowNumber - 1,
                    'endIndex' => $rowNumber,
                ]),
            ]);

            $batchRequest = new BatchUpdateSpreadsheetRequest([
                'requests' => [new SheetsRequest(['deleteDimension' => $deleteRequest])],
            ]);

            $this->service()->spreadsheets->batchUpdate($this->getSheetId(), $batchRequest);
            $this->invalidateCache();

            return true;
        } catch (\Throwable $e) {
            Log::error('Google Sheets delete gagal', [
                'surat_id' => $id,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public function nextId(): int
    {
        $max = 0;

        foreach ($this->loadRows() as $surat) {
            $max = max($max, $surat->id);
        }

        return $max + 1;
    }

    /**
     * @return array<int, SuratRecord>
     */
    private function loadRows(): array
    {
        if ($this->cachedRows !== null) {
            return $this->cachedRows;
        }

        if (! $this->isConfigured()) {
            return $this->cachedRows = [];
        }

        try {
            $this->ensureHeaders();

            $response = $this->service()->spreadsheets_values->get(
                $this->getSheetId(),
                $this->range('A:L')
            );

            $rows = [];

            foreach ($response->getValues() ?? [] as $row) {
                $record = SuratRecord::fromSheetRow($row);

                if ($record !== null) {
                    $rows[$record->id] = $record;
                }
            }

            return $this->cachedRows = $rows;
        } catch (\Throwable $e) {
            Log::error('Google Sheets load gagal', ['message' => $e->getMessage()]);

            return $this->cachedRows = [];
        }
    }

    private function findRowNumberById(int $suratId): ?int
    {
        $response = $this->service()->spreadsheets_values->get(
            $this->getSheetId(),
            $this->range('A:A')
        );

        foreach ($response->getValues() ?? [] as $index => $row) {
            if ($index === 0 && ($row[0] ?? '') === 'ID') {
                continue;
            }

            if (isset($row[0]) && (int) $row[0] === $suratId) {
                return $index + 1;
            }
        }

        return null;
    }

    private function ensureHeaders(): void
    {
        if ($this->headersEnsured) {
            return;
        }

        $response = $this->service()->spreadsheets_values->get(
            $this->getSheetId(),
            $this->range('A1:L1')
        );

        $values = $response->getValues();

        if (! empty($values) && ($values[0][0] ?? '') === 'ID') {
            $this->headersEnsured = true;

            return;
        }

        $headers = new ValueRange([
            'values' => [[
                'ID',
                'Nomor Surat',
                'Tanggal Masuk',
                'Tanggal Buat',
                'Nama Pengirim',
                'Nama Surat',
                'Nama File',
                'Status',
                'Link Drive',
                'Diperbarui',
                'Drive File ID',
                'Dibuat',
            ]],
        ]);

        $this->service()->spreadsheets_values->update(
            $this->getSheetId(),
            $this->range('A1:L1'),
            $headers,
            ['valueInputOption' => 'USER_ENTERED']
        );

        $this->headersEnsured = true;
    }

    private function getSheetNumericId(): int
    {
        $spreadsheet = $this->service()->spreadsheets->get($this->getSheetId());
        $sheetName = config('google.sheet_name', 'Sheet1');

        foreach ($spreadsheet->getSheets() as $sheet) {
            if ($sheet->getProperties()->getTitle() === $sheetName) {
                return (int) $sheet->getProperties()->getSheetId();
            }
        }

        return (int) $spreadsheet->getSheets()[0]->getProperties()->getSheetId();
    }

    private function range(string $cells): string
    {
        return config('google.sheet_name', 'Sheet1') . '!' . $cells;
    }

    /**
     * Apply normal text formatting (font size 10, black, not bold) to a specific row.
     */
    private function applyRowFormatting(int $rowNumber): void
    {
        $sheetId = $this->getSheetNumericId();
        $repeatRequest = new RepeatCellRequest([
            'range' => [
                'sheetId' => $sheetId,
                'startRowIndex' => $rowNumber - 1,
                'endRowIndex' => $rowNumber,
                'startColumnIndex' => 0,
                'endColumnIndex' => 12,
            ],
            'cell' => new CellData([
                'userEnteredFormat' => [
                    'textFormat' => [
                        'fontSize' => 10,
                        'foregroundColor' => ['red' => 0, 'green' => 0, 'blue' => 0],
                        'bold' => false,
                    ],
                ],
            ]),
            'fields' => 'userEnteredFormat.textFormat',
        ]);

        $batch = new BatchUpdateSpreadsheetRequest([
            'requests' => [new SheetsRequest(['repeatCell' => $repeatRequest])],
        ]);

        $this->service()->spreadsheets->batchUpdate($this->getSheetId(), $batch);
    }

    private function invalidateCache(): void
    {
        $this->cachedRows = null;
    }

    private function service(): Sheets
    {
        return $this->sheets ??= $this->googleClientFactory->sheetsService();
    }
}
