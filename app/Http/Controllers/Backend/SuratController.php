<?php



namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;


use App\Services\GoogleDriveService;

use App\Services\GoogleSheetService;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Log;



class SuratController extends Controller

{

    public function __construct(

        private readonly GoogleDriveService $googleDrive,

        private readonly GoogleSheetService $googleSheet,

    ) {}

    private function setUserContext(): void
    {
        $user = auth()->user();
        $this->googleDrive->setUser($user);
        $this->googleSheet->setUser($user);
    }



    public function index()

    {

        $this->setUserContext();

        $surats = $this->googleSheet->all();



        return view('backend.surat.index', compact('surats'));

    }



    public function create()

    {

        return view('backend.surat.create');

    }



    public function store(Request $request)

    {

        $this->setUserContext();

        $request->validate([

            'nomor_surat'   => 'required|string|max:255',

            'tanggal_masuk' => 'required|date',

            'tanggal_buat'  => 'required|date',

            'nama_pengirim' => 'required|string|max:255',

            'nama_surat'    => 'required|string|max:255',

            'status'        => 'nullable|in:pending,processing,done',

            'file_surat'    => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,odt,txt,rtf,html,zip,epub|max:102400',

        ]);



        $this->ensureGoogleConfigured();



        $file = $request->file('file_surat');

        $namaFile = $file->getClientOriginalName();

        $localPath = $file->getRealPath();



        $fileId = $this->googleDrive->upload($localPath, $namaFile, $request->tanggal_masuk, 'Surat Masuk');



        if (! $fileId) {

            return back()

                ->withInput()

                ->withErrors(['file_surat' => 'Gagal mengunggah file ke Google Drive. Periksa konfigurasi Google.']);

        }



        $driveLink = $this->googleDrive->getViewLink($fileId);



        try {

            $this->googleSheet->insert([

                'nomor_surat'   => $request->nomor_surat,

                'tanggal_masuk' => $request->tanggal_masuk,

                'tanggal_buat'  => $request->tanggal_buat,

                'nama_pengirim' => $request->nama_pengirim,

                'nama_surat'    => $request->nama_surat,

                'nama_file'     => $namaFile,

                'status'        => $request->status ?? 'pending',

            ], $fileId, $driveLink);

        } catch (\Throwable $e) {

            $this->googleDrive->delete($fileId);

            Log::error('Gagal menyimpan surat ke Google Sheets', ['message' => $e->getMessage()]);



            return back()

                ->withInput()

                ->withErrors(['file_surat' => 'Gagal menyimpan data surat ke Google Sheets.']);

        }



        return redirect()->route('surat.index')->with('success', 'Surat berhasil ditambahkan ke Google Drive & Google Sheets');

    }



    public function edit($id)

    {

        $this->setUserContext();

        $surat = $this->googleSheet->find((int) $id);



        if ($surat === null) {

            abort(404, 'Surat tidak ditemukan.');

        }



        return view('backend.surat.edit', compact('surat'));

    }



    public function update(Request $request, $id)

    {

        $this->setUserContext();

        $surat = $this->googleSheet->find((int) $id);



        if ($surat === null) {

            abort(404, 'Surat tidak ditemukan.');

        }



        $request->validate([

            'nomor_surat'   => 'required|string|max:255',

            'tanggal_masuk' => 'required|date',

            'tanggal_buat'  => 'required|date',

            'nama_pengirim' => 'required|string|max:255',

            'nama_surat'    => 'required|string|max:255',

            'status'        => 'nullable|in:pending,processing,done',

            'file_surat'    => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,odt,txt,rtf,html,zip,epub|max:102400',

        ]);



        $this->ensureGoogleConfigured();



        $data = [

            'nomor_surat'   => $request->nomor_surat,

            'tanggal_masuk' => $request->tanggal_masuk,

            'tanggal_buat'  => $request->tanggal_buat,

            'nama_pengirim' => $request->nama_pengirim,

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
                $request->tanggal_masuk,
                'Surat Masuk'
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



        $updated = $this->googleSheet->update((int) $id, $data, $fileId, $driveLink);



        if ($updated === null) {

            return back()

                ->withInput()

                ->withErrors(['nomor_surat' => 'Gagal memperbarui data surat di Google Sheets.']);

        }



        return redirect()->route('surat.index')->with('success', 'Surat berhasil diperbarui');

    }



    public function destroy($id)

    {

        $this->setUserContext();

        $surat = $this->googleSheet->find((int) $id);



        if ($surat === null) {

            abort(404, 'Surat tidak ditemukan.');

        }



        $this->googleDrive->delete($surat->google_drive_file_id);

        $this->googleSheet->delete((int) $id);



        return redirect()->back()->with('success', 'Surat berhasil dihapus dari Google Drive & Google Sheets');

    }



    public function preview($id, $filename = null)

    {

        $this->setUserContext();

        $surat = $this->googleSheet->find((int) $id);



        if ($surat === null || empty($surat->google_drive_file_id)) {

            abort(404, 'File surat tidak ditemukan.');

        }



        $file = $this->googleDrive->downloadContent($surat->google_drive_file_id);



        if ($file === null) {

            abort(404, 'File surat tidak dapat diambil dari Google Drive.');

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
        if (! $this->googleDrive->isConfigured() || ! $this->googleSheet->isConfigured()) {
            $message = 'Integrasi Google belum dikonfigurasi. ';
            if (! $this->googleDrive->isConfigured() || ! $this->googleSheet->isConfigured()) {
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


