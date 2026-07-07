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
            'nomor_surat'  => 'required|string|max:255',
            'tanggal_masuk' => 'required|date',
            'tanggal_buat'  => 'required|date',
            'nama_pengirim' => 'required|string|max:255',
            'nama_surat'    => 'required|string|max:255',
            'file_surat'    => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:102400', // Maksimal 100MB
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
            'file_surat'    => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:102400', // Opsional saat edit
        ]);

        $data = [
            'nomor_surat'   => $request->nomor_surat,
            'tanggal_masuk' => $request->tanggal_masuk,
            'tanggal_buat'  => $request->tanggal_buat,
            'nama_pengirim' => $request->nama_pengirim,
            'nama_surat'    => $request->nama_surat,
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
}
