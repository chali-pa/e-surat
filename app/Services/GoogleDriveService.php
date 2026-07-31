<?php

namespace App\Services;

use App\Support\GoogleErrorMessage;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GoogleDriveService
{
    private ?Drive $drive = null;

    /** @var array<string, string> */
    private array $folderCache = [];

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

    public function isConfigured(): bool
    {
        return $this->googleClientFactory->isConfigured();
    }

    /**
     * Upload file ke Google Drive dalam folder bulan/jenis surat/kategori.
     * Mengembalikan file ID.
     *
     * @param string $suratType 'Surat Masuk' atau 'Surat Keluar'
     */
    public function upload(string $localPath, string $fileName, ?string $referenceDate = null, string $suratType = 'Surat Masuk'): ?string
    {
        if (! $this->isConfigured() || ! is_readable($localPath)) {
            return null;
        }

        try {
            $parentFolderId = $this->resolveUploadFolder($fileName, $referenceDate, $suratType);

            $metadata = new DriveFile([
                'name' => $this->uniqueFileName($fileName),
                'parents' => [$parentFolderId],
            ]);

            $mimeType = \Illuminate\Support\Facades\File::mimeType($localPath) ?? 'application/octet-stream';

            $file = $this->service()->files->create($metadata, [
                'data' => file_get_contents($localPath),
                'mimeType' => $mimeType,
                'uploadType' => 'multipart',
                'fields' => 'id,webViewLink',
                'supportsAllDrives' => true,
            ]);

            return $file->getId();
        } catch (\Throwable $e) {
            Log::error('Google Drive upload gagal', [
                'file' => $fileName,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Ganti file lama dengan file baru (hapus lama, upload baru).
     */
    public function replace(?string $oldFileId, string $localPath, string $fileName, ?string $referenceDate = null, string $suratType = 'Surat Masuk'): ?string
    {
        if ($oldFileId) {
            $this->delete($oldFileId);
        }

        return $this->upload($localPath, $fileName, $referenceDate, $suratType);
    }

    /**
     * Perbarui konten file yang sudah ada di Google Drive.
     */
    public function update(string $fileId, string $localPath, string $fileName): bool
    {
        if (! $this->isConfigured() || ! is_readable($localPath)) {
            return false;
        }

        try {
            $metadata = new DriveFile(['name' => $fileName]);
            $mimeType = \Illuminate\Support\Facades\File::mimeType($localPath) ?? 'application/octet-stream';

            $this->service()->files->update($fileId, $metadata, [
                'data' => file_get_contents($localPath),
                'mimeType' => $mimeType,
                'uploadType' => 'multipart',
                'supportsAllDrives' => true,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Google Drive update gagal', [
                'file_id' => $fileId,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Hapus file dari Google Drive.
     */
    public function delete(?string $fileId): bool
    {
        if (! $this->isConfigured() || empty($fileId)) {
            return false;
        }

        try {
            $this->service()->files->delete($fileId, ['supportsAllDrives' => true]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Google Drive delete gagal', [
                'file_id' => $fileId,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Unduh konten file untuk preview/stream.
     *
     * @return array{content: string, mimeType: string, name: string}|null
     */
    public function downloadContent(?string $fileId): ?array
    {
        if (! $this->isConfigured() || empty($fileId)) {
            return null;
        }

        try {
            $meta = $this->service()->files->get($fileId, [
                'fields' => 'name,mimeType',
                'supportsAllDrives' => true,
            ]);

            $content = $this->service()->files->get($fileId, [
                'alt' => 'media',
                'supportsAllDrives' => true,
            ]);

            $body = $content->getBody()->getContents();

            return [
                'content' => $body,
                'mimeType' => $meta->getMimeType() ?: 'application/octet-stream',
                'name' => $meta->getName() ?: 'surat',
            ];
        } catch (\Throwable $e) {
            Log::error('Google Drive download gagal', [
                'file_id' => $fileId,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function getViewLink(?string $fileId): ?string
    {
        if (empty($fileId)) {
            return null;
        }

        if (! $this->isConfigured()) {
            return "https://drive.google.com/file/d/{$fileId}/view";
        }

        try {
            $file = $this->service()->files->get($fileId, [
                'fields' => 'webViewLink',
                'supportsAllDrives' => true,
            ]);

            return $file->getWebViewLink() ?: "https://drive.google.com/file/d/{$fileId}/view";
        } catch (\Throwable $e) {
            return "https://drive.google.com/file/d/{$fileId}/view";
        }
    }

    /**
     * Tentukan folder upload: {root}/{YYYY-MM}/{Surat Masuk|Surat Keluar}/{PDF|Excel|Foto}
     */
    public function resolveUploadFolder(string $fileName, ?string $referenceDate = null, string $suratType = 'Surat Masuk'): string
    {
        // Use user's folder ID if available, otherwise fall back to global config
        $rootId = $this->user && $this->user->google_drive_folder_id 
            ? $this->user->google_drive_folder_id 
            : (string) config('google.drive_folder_id');
        
        $monthName = $this->monthFolderName($referenceDate);
        $category = $this->resolveCategory($fileName);

        $monthFolderId = $this->findOrCreateFolder($monthName, $rootId);
        $typeFolderId = $this->findOrCreateFolder($suratType, $monthFolderId);

        return $this->findOrCreateFolder($category, $typeFolderId);
    }

    public function findOrCreateFolder(string $name, string $parentId): string
    {
        $cacheKey = $parentId . ':' . $name;

        if (isset($this->folderCache[$cacheKey])) {
            return $this->folderCache[$cacheKey];
        }

        $escapedName = str_replace("'", "\\'", $name);
        $query = sprintf(
            "name='%s' and '%s' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            $escapedName,
            $parentId
        );

        $results = $this->service()->files->listFiles([
            'q' => $query,
            'fields' => 'files(id,name)',
            'supportsAllDrives' => true,
            'includeItemsFromAllDrives' => true,
            'pageSize' => 1,
        ]);

        $files = $results->getFiles();

        if (! empty($files)) {
            $this->folderCache[$cacheKey] = $files[0]->getId();

            return $this->folderCache[$cacheKey];
        }

        $folder = new DriveFile([
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
            'parents' => [$parentId],
        ]);

        $created = $this->service()->files->create($folder, [
            'fields' => 'id',
            'supportsAllDrives' => true,
        ]);

        $this->folderCache[$cacheKey] = $created->getId();

        return $this->folderCache[$cacheKey];
    }

    public function resolveCategory(string $fileName): string
    {
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $foto = config('google.file_categories.foto', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
        $excel = config('google.file_categories.excel', ['xls', 'xlsx', 'csv', 'ods']);
        $dokumen = config('google.file_categories.dokumen', ['doc', 'docx', 'odt', 'rtf', 'txt', 'html']);
        $arsip = config('google.file_categories.arsip', ['zip', 'rar', 'epub']);

        if (in_array($ext, $foto, true)) {
            return 'Foto';
        }

        if (in_array($ext, $excel, true)) {
            return 'Excel';
        }

        if (in_array($ext, $dokumen, true)) {
            return 'Dokumen';
        }

        if (in_array($ext, $arsip, true)) {
            return 'Arsip';
        }

        return 'PDF';
    }

    private function monthFolderName(?string $referenceDate): string
    {
        try {
            $date = $referenceDate ? new \DateTime($referenceDate) : new \DateTime;
        } catch (\Throwable) {
            $date = new \DateTime;
        }

        return $date->format('Y-m');
    }

    private function uniqueFileName(string $fileName): string
    {
        $base = pathinfo($fileName, PATHINFO_FILENAME);
        $ext = pathinfo($fileName, PATHINFO_EXTENSION);

        $safeBase = preg_replace('/[^\p{L}\p{N}\-_ ]/u', '_', $base) ?: 'surat';
        $suffix = now()->format('His');

        return $ext !== ''
            ? "{$safeBase}_{$suffix}.{$ext}"
            : "{$safeBase}_{$suffix}";
    }

    private function service(): Drive
    {
        return $this->drive ??= $this->googleClientFactory->driveService();
    }
}
