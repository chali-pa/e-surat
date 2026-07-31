<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Services\GoogleDriveService;
use App\Services\GoogleSheetKeluarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SuratKeluarController extends Controller
{
    public function __construct(
        private readonly GoogleDriveService $googleDrive,
        private readonly GoogleSheetKeluarService $googleSheetKeluar,
    ) {}

    private function setUserContext(): void
    {
        $user = auth()->user();
        $this->googleDrive->setUser($user);
        $this->googleSheetKeluar->setUser($user);
    }

    public function index()
    {
        $this->setUserContext();
        $surats = $this->googleSheetKeluar->all();

        return view('backend.surat_keluar.index', compact('surats'));
    }

    public function create()
    {
        return view('backend.surat_keluar.create');
    }

    public function store(Request $request)
    {
        $this->setUserContext();
        $request->validate([
            'nomor_surat'   => 'required|string|max:255',
            'tanggal_keluar' => 'required|date',
            'tanggal_buat'  => 'required|date',
            'nama_penerima' => 'required|string|max:255',
            'nama_surat'    => 'required|string|max:255',
            'status'        => 'nullable|in:pending,processing,done',
            'file_surat'    => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,odt,txt,rtf,html,zip,epub|max:102400',
        ]);

        $this->ensureGoogleConfigured();

        $file = $request->file('file_surat');
        $namaFile = $file->getClientOriginalName();
        $localPath = $file->getRealPath();

        $fileId = $this->googleDrive->upload($localPath, $namaFile, $request->tanggal_keluar, 'Surat Keluar');

        if (! $fileId) {
            return back()
                ->withInput()
                ->withErrors(['file_surat' => 'Gagal mengunggah file ke Google Drive. Periksa konfigurasi Google.']);
        }

        $driveLink = $this->googleDrive->getViewLink($fileId);

        try {
            $this->googleSheetKeluar->insert([
                'nomor_surat'   => $request->nomor_surat,
                'tanggal_keluar' => $request->tanggal_keluar,
                'tanggal_buat'  => $request->tanggal_buat,
                'nama_penerima' => $request->nama_penerima,
                'nama_surat'    => $request->nama_surat,
                'nama_file'     => $namaFile,
                'status'        => $request->status ?? 'pending',
            ], $fileId, $driveLink);
        } catch (\Throwable $e) {
            $this->googleDrive->delete($fileId);
            Log::error('Gagal menyimpan surat keluar ke Google Sheets', ['message' => $e->getMessage()]);

            return back()
                ->withInput()
                ->withErrors(['file_surat' => 'Gagal menyimpan data surat ke Google Sheets.']);
        }

        return redirect()->route('surat_keluar.index')->with('success', 'Surat keluar berhasil ditambahkan ke Google Drive & Google Sheets');
    }

    public function edit($id)
    {
        $this->setUserContext();
        $surat = $this->googleSheetKeluar->find((int) $id);

        if ($surat === null) {
            abort(404, 'Surat keluar tidak ditemukan.');
        }

        return view('backend.surat_keluar.edit', compact('surat'));
    }

    public function update(Request $request, $id)
    {
        $this->setUserContext();
        $surat = $this->googleSheetKeluar->find((int) $id);

        if ($surat === null) {
            abort(404, 'Surat keluar tidak ditemukan.');
        }

        $request->validate([
            'nomor_surat'   => 'required|string|max:255',
            'tanggal_keluar' => 'required|date',
            'tanggal_buat'  => 'required|date',
            'nama_penerima' => 'required|string|max:255',
            'nama_surat'    => 'required|string|max:255',
            'status'        => 'nullable|in:pending,processing,done',
            'file_surat'    => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,odt,txt,rtf,html,zip,epub|max:102400',
        ]);

        $this->ensureGoogleConfigured();

        $data = [
            'nomor_surat'   => $request->nomor_surat,
            'tanggal_keluar' => $request->tanggal_keluar,
            'tanggal_buat'  => $request->tanggal_buat,
            'nama_penerima' => $request->nama_penerima,
            'nama_surat'    => $request->nama_surat,
            'status'        => $request->status ?? $surat->status,
        ];

        $fileId = $surat->google_drive_file_id;
        $driveLink = $surat->drive_link;

        if ($request->hasFile('file_surat')) {
            $file = $request->file('file_surat');
            $namaFile = $file->getClientOriginalName();
            $localPath = $file->getRealPath();

            $newFileId = $this->googleDrive->replace(
                $surat->google_drive_file_id,
                $localPath,
                $namaFile,
                $request->tanggal_keluar,
                'Surat Keluar'
            );

            if (! $newFileId) {
                return back()
                    ->withInput()
                    ->withErrors(['file_surat' => 'Gagal memperbarui file di Google Drive.']);
            }

            $fileId = $newFileId;
            $driveLink = $this->googleDrive->getViewLink($fileId);
            $data['nama_file'] = $namaFile;
        }

        $updated = $this->googleSheetKeluar->update((int) $id, $data, $fileId, $driveLink);

        if ($updated === null) {
            return back()
                ->withInput()
                ->withErrors(['nomor_surat' => 'Gagal memperbarui data surat di Google Sheets.']);
        }

        return redirect()->route('surat_keluar.index')->with('success', 'Surat keluar berhasil diperbarui');
    }

    public function destroy($id)
    {
        $this->setUserContext();
        $surat = $this->googleSheetKeluar->find((int) $id);

        if ($surat === null) {
            abort(404, 'Surat keluar tidak ditemukan.');
        }

        $this->googleDrive->delete($surat->google_drive_file_id);
        $this->googleSheetKeluar->delete((int) $id);

        return redirect()->back()->with('success', 'Surat keluar berhasil dihapus dari Google Drive & Google Sheets');
    }

    public function preview($id, $filename = null)
    {
        $this->setUserContext();
        $surat = $this->googleSheetKeluar->find((int) $id);

        if ($surat === null || empty($surat->google_drive_file_id)) {
            abort(404, 'File surat keluar tidak ditemukan.');
        }

        $file = $this->googleDrive->downloadContent($surat->google_drive_file_id);

        if ($file === null) {
            abort(404, 'File surat keluar tidak dapat diambil dari Google Drive.');
        }

        $extension = strtolower(pathinfo($surat->nama_file, PATHINFO_EXTENSION));
        $mimeType = $this->getMimeType($extension, $file['mimeType']);

        return response($file['content'], 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $surat->nama_file . '"',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function ensureGoogleConfigured(): void
    {
        if (! $this->googleDrive->isConfigured() || ! $this->googleSheetKeluar->isConfigured()) {
            $message = 'Integrasi Google belum dikonfigurasi. ';
            if (! $this->googleDrive->isConfigured() || ! $this->googleSheetKeluar->isConfigured()) {
                $message .= 'Silakan <a href="' . route('google.connect') . '" class="underline font-semibold">hubungkan akun Google</a> terlebih dahulu.';
            }
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                redirect()->back()->withInput()->withErrors(['google' => $message])
            );
        }
    }

    private function getMimeType(string $extension, ?string $fallback = null): string
    {
        $mimeTypes = [
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'txt' => 'text/plain',
            'html' => 'text/html',
            'htm' => 'text/html',
        ];

        return $mimeTypes[$extension] ?? $fallback ?? 'application/octet-stream';
    }
}
