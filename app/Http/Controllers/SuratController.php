<?php

namespace App\Http\Controllers;

use App\Models\Surat;
use Illuminate\Http\Request;

class SuratController extends Controller
{
    public function index()
    {
        // Mengambil semua data surat untuk ditampilkan di tabel
        $surats = Surat::all();
        return view('surat.index', compact('surats'));
    }

    public function create()
    {
        return view('surat.create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'nomor_surat'   => 'required|string|max:255',
            'tanggal_masuk' => 'required|date',
            'tanggal_buat'  => 'required|date',
            'nama_pengirim' => 'required|string|max:255',
            'nama_surat'    => 'required|string|max:255',
            'status'        => 'nullable|in:pending,processing,done',
            'file_surat'    => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,odt,txt,rtf,html,zip,epub|max:102400',
        ]);

        $file = $request->file('file_surat');
        $nama_file = $file->getClientOriginalName();
        $file_path = $file->storeAs('surat', time() . '_' . $nama_file, 'public');

        Surat::create([
            'nomor_surat' => $request->nomor_surat,
            'tanggal_masuk' => $request->tanggal_masuk,
            'tanggal_buat' => $request->tanggal_buat,
            'nama_pengirim' => $request->nama_pengirim,
            'nama_surat' => $request->nama_surat,
            'nama_file' => $nama_file,
            'file_path' => $file_path,
            'status' => $request->status ?? 'pending',
        ]);

        return redirect()->route('surat.index')->with('success', 'Surat berhasil ditambahkan');
    }

    public function edit($id)
    {
        $surat = Surat::findOrFail($id);
        return view('surat.edit', compact('surat'));
    }

    public function update(Request $request, $id)
    {
        $surat = Surat::findOrFail($id);

        $request->validate([
            'nomor_surat'  => 'required|string|max:255',
            'tanggal_masuk' => 'required|date',
            'tanggal_buat'  => 'required|date',
            'nama_pengirim' => 'required|string|max:255',
            'nama_surat'    => 'required|string|max:255',
            'status'        => 'nullable|in:pending,processing,done',
            'file_surat'    => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx,xlsx|max:102400', 
        ]);

        $data = [
            'nomor_surat'   => $request->nomor_surat,
            'tanggal_masuk' => $request->tanggal_masuk,
            'tanggal_buat'  => $request->tanggal_buat,
            'nama_pengirim' => $request->nama_pengirim,
            'nama_surat'    => $request->nama_surat,
            'status'        => $request->status ?? $surat->status,
        ];

        // Jika ada file baru di-upload, ganti file lama
        if ($request->hasFile('file_surat')) {
            // Hapus file lama dari storage
            \Storage::disk('public')->delete($surat->file_path);

            $file = $request->file('file_surat');
            $nama_file = $file->getClientOriginalName();
            $file_path = $file->storeAs('surat', time() . '_' . $nama_file, 'public');

            $data['nama_file'] = $nama_file;
            $data['file_path'] = $file_path;
        }

        $surat->update($data);

        return redirect()->route('surat.index')->with('success', 'Surat berhasil diperbarui');
    }

    public function destroy($id)
    {
        $surat = Surat::findOrFail($id);
        // Hapus file fisik dari storage
        \Storage::disk('public')->delete($surat->file_path);
        $surat->delete();
        return redirect()->back()->with('success', 'Surat berhasil dihapus');
    }

    public function preview($id)
    {
        $surat = Surat::findOrFail($id);
        $path = \Storage::disk('public')->path($surat->file_path);

        if (!file_exists($path)) {
            abort(404, 'File surat tidak ditemukan.');
        }

        // Dapatkan MIME type berdasarkan ekstensi file
        $extension = strtolower(pathinfo($surat->nama_file, PATHINFO_EXTENSION));
        $mimeType = $this->getMimeType($extension);
        
        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $surat->nama_file . '"',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Cache-Control' => 'public, max-age=3600'
        ]);
    }

    public function previewPdf(Surat $surat)
{
    $originalPath = storage_path('app/public/surat/' . $surat->nama_file);

    if (!file_exists($originalPath)) {
        abort(404, 'File surat tidak ditemukan.');
    }

    $ext = strtolower(pathinfo($originalPath, PATHINFO_EXTENSION));

    // Kalau bukan docx/doc, tidak perlu dikonversi — kirim apa adanya.
    if (!in_array($ext, ['doc', 'docx'])) {
        return response()->file($originalPath);
    }

    $cacheDir = storage_path('app/public/preview-cache');
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    // Nama file cache disertai timestamp file asli, supaya otomatis
    // re-convert kalau file surat diganti/diedit.
    $baseName = pathinfo($originalPath, PATHINFO_FILENAME);
    $pdfCacheName = $baseName . '_' . filemtime($originalPath) . '.pdf';
    $pdfCachePath = $cacheDir . '/' . $pdfCacheName;

    if (!file_exists($pdfCachePath)) {
        $sofficeBin = env('LIBREOFFICE_PATH', 'soffice');

        $cmd = escapeshellarg($sofficeBin)
            . ' --headless --norestore --convert-to pdf --outdir '
            . escapeshellarg($cacheDir) . ' '
            . escapeshellarg($originalPath)
            . ' 2>&1';

        exec($cmd, $output, $exitCode);
        $generatedPath = $cacheDir . '/' . $baseName . '.pdf';

        if (file_exists($generatedPath)) {
            rename($generatedPath, $pdfCachePath);
        }

        if (!file_exists($pdfCachePath)) {
            \Log::error('Gagal konversi DOCX ke PDF', [
                'surat_id' => $surat->id,
                'file' => $originalPath,
                'output' => $output,
                'exit_code' => $exitCode,
            ]);
            abort(500, 'Gagal mengonversi dokumen ke PDF. Pastikan LibreOffice sudah terinstall di server.');
        }
    }

    return response()->file($pdfCachePath, [
        'Content-Type' => 'application/pdf',
        'Content-Disposition' => 'inline; filename="' . $baseName . '.pdf"',
    ]);
}
    
    private function getMimeType($extension)
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
            'htm' => 'text/html'
        ];
        
        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}

