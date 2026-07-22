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

