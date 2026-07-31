<?php

namespace App\Services;

use App\Models\User;
use Google\Service\Drive\DriveFile;
use Google\Service\Sheets\Spreadsheet;
use Google\Service\Sheets\Sheet;
use Google\Service\Sheets\ValueRange;
use Illuminate\Support\Facades\Log;

class GoogleUserSetupService
{
    public function __construct(
        private readonly GoogleClientFactory $googleClientFactory,
        private readonly GoogleDriveService $googleDrive,
    ) {}

    /**
     * Initialize Google Drive folder structure and Sheets for a new user
     */
    public function setupUserGoogleWorkspace(User $user, array $googleToken): bool
    {
        try {
            // Set the user token for this operation
            $this->googleClientFactory->setUserToken($googleToken);
            $this->googleDrive->setUser($user);

            // Create main folder for user
            $userFolderName = $this->generateUserFolderName($user);
            $userFolderId = $this->createUserFolder($userFolderName);

            if (! $userFolderId) {
                Log::error('Failed to create user folder', ['user_id' => $user->id]);
                return false;
            }

            // Create subfolders for Surat Masuk and Surat Keluar
            $suratMasukFolderId = $this->googleDrive->findOrCreateFolder('Surat Masuk', $userFolderId);
            $suratKeluarFolderId = $this->googleDrive->findOrCreateFolder('Surat Keluar', $userFolderId);

            // Create category folders within each type
            $categories = ['PDF', 'Excel', 'Foto'];
            foreach ($categories as $category) {
                $this->googleDrive->findOrCreateFolder($category, $suratMasukFolderId);
                $this->googleDrive->findOrCreateFolder($category, $suratKeluarFolderId);
            }

            // Create Google Sheets for data storage
            $suratMasukSheetId = $this->createSpreadsheet("Data Surat Masuk - {$user->name}");
            $suratKeluarSheetId = $this->createSpreadsheet("Data Surat Keluar - {$user->name}");

            if (! $suratMasukSheetId || ! $suratKeluarSheetId) {
                Log::error('Failed to create user spreadsheets', ['user_id' => $user->id]);
                return false;
            }

            // Initialize sheet headers for Surat Masuk
            $this->initializeSuratMasukSheet($suratMasukSheetId);

            // Initialize sheet headers for Surat Keluar
            $this->initializeSuratKeluarSheet($suratKeluarSheetId);

            // Update user with Google IDs
            $user->update([
                'google_drive_folder_id' => $userFolderId,
                'google_sheet_id' => $suratMasukSheetId,
                'google_sheet_keluar_id' => $suratKeluarSheetId,
                'google_token' => $googleToken,
            ]);

            Log::info('User Google workspace setup completed', ['user_id' => $user->id]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to setup user Google workspace', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    private function generateUserFolderName(User $user): string
    {
        // Create a unique folder name based on user's email and name
        $safeName = preg_replace('/[^a-zA-Z0-9\s-]/', '', $user->name);
        $safeEmail = preg_replace('/[^a-zA-Z0-9@.-]/', '', $user->email);
        return "E-Surat - {$safeName} ({$safeEmail})";
    }

    private function createUserFolder(string $folderName): ?string
    {
        try {
            $drive = $this->googleClientFactory->driveService();

            // Check if folder already exists in root
            $escapedName = str_replace("'", "\\'", $folderName);
            $query = sprintf(
                "name='%s' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                $escapedName
            );

            $results = $drive->files->listFiles([
                'q' => $query,
                'fields' => 'files(id,name)',
                'pageSize' => 1,
            ]);

            $files = $results->getFiles();
            if (! empty($files)) {
                return $files[0]->getId();
            }

            // Create new folder
            $folder = new DriveFile([
                'name' => $folderName,
                'mimeType' => 'application/vnd.google-apps.folder',
            ]);

            $created = $drive->files->create($folder, [
                'fields' => 'id',
            ]);

            return $created->getId();
        } catch (\Throwable $e) {
            Log::error('Failed to create user folder', [
                'folder_name' => $folderName,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function createSpreadsheet(string $title): ?string
    {
        try {
            $sheets = $this->googleClientFactory->sheetsService();

            $spreadsheet = new Spreadsheet([
                'properties' => [
                    'title' => $title,
                ],
            ]);

            $created = $sheets->spreadsheets->create($spreadsheet);

            return $created->spreadsheetId;
        } catch (\Throwable $e) {
            Log::error('Failed to create spreadsheet', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function initializeSuratMasukSheet(string $sheetId): void
    {
        try {
            $sheets = $this->googleClientFactory->sheetsService();

            $headers = [
                'ID',
                'Nomor Surat',
                'Tanggal Masuk',
                'Tanggal Buat',
                'Nama Pengirim',
                'Nama Surat',
                'Nama File',
                'Status',
                'Google Drive File ID',
                'Drive Link',
                'Created At',
                'Updated At',
            ];

            $body = new ValueRange([
                'values' => [$headers],
            ]);

            $sheets->spreadsheets_values->update(
                $sheetId,
                'Sheet1!A1:L1',
                $body,
                ['valueInputOption' => 'USER_ENTERED']
            );
        } catch (\Throwable $e) {
            Log::error('Failed to initialize Surat Masuk sheet', [
                'sheet_id' => $sheetId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function initializeSuratKeluarSheet(string $sheetId): void
    {
        try {
            $sheets = $this->googleClientFactory->sheetsService();

            $headers = [
                'ID',
                'Nomor Surat',
                'Tanggal Keluar',
                'Tanggal Buat',
                'Nama Penerima',
                'Nama Surat',
                'Nama File',
                'Status',
                'Google Drive File ID',
                'Drive Link',
                'Created At',
                'Updated At',
            ];

            $body = new ValueRange([
                'values' => [$headers],
            ]);

            $sheets->spreadsheets_values->update(
                $sheetId,
                'Sheet1!A1:L1',
                $body,
                ['valueInputOption' => 'USER_ENTERED']
            );
        } catch (\Throwable $e) {
            Log::error('Failed to initialize Surat Keluar sheet', [
                'sheet_id' => $sheetId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}