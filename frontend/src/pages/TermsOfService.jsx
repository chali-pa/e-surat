import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service | E-Surat'
    window.scrollTo(0, 0)
  }, [])

  const lastUpdatedDate = '18 Agustus 2026'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-10 sm:h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-[#4B164C] bg-purple-50 hover:bg-purple-100 transition"
            >
              Masuk
            </Link>
            <Link
              to="/"
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white transition shadow-xs"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              Beranda
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
          
          {/* Badge & Title */}
          <div className="mb-8 border-b border-slate-100 pb-6">
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#4B164C] bg-purple-100 rounded-full mb-3">
              Dokumentasi Hukum Publik
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
              Syarat dan Ketentuan Layanan (Terms of Service)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Terakhir Diperbarui: <span className="text-slate-700 font-semibold">{lastUpdatedDate}</span>
            </p>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-600">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">1</span>
                Penerimaan Ketentuan
              </h2>
              <p className="mb-3">
                Dengan mengakses, mendaftar, atau menggunakan aplikasi <strong>E-Surat (Sistem Manajemen Surat)</strong>, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan Layanan ini.
              </p>
              <p>
                Jika Anda tidak menyetujui bagian mana pun dari Syarat dan Ketentuan ini, Anda tidak diperkenankan mengakses atau menggunakan aplikasi E-Surat.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">2</span>
                Deskripsi Layanan
              </h2>
              <p className="mb-3">
                E-Surat menyediakan platform digital untuk pengelolaan dan pengarsipan surat elektronik dengan fitur utama meliputi:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Pencatatan data Surat Masuk dan Surat Keluar melalui formulir digital.</li>
                <li>Pengunggahan dan penyimpanan berkas lampiran surat (PDF, Excel, Word, Gambar).</li>
                <li>Integrasi otomatis ke Google Drive pengguna dengan pengelompokan folder <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">esurat/incoming</code> dan <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">esurat/outgoing</code> serta folder bulanan (Januari–Desember).</li>
                <li>Sinkronisasi data ke Google Spreadsheet (<code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">E-Surat Masuk</code> & <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">E-Surat Keluar</code>) lengkap dengan formula tautan file.</li>
                <li>Pratinjau (Preview) dokumen langsung di dalam modal aplikasi tanpa perlu mengunduh file.</li>
                <li>Pencetakan dokumen (Print) yang mengisolasi tampilan berkas tanpa menyertakan elemen antarmuka aplikasi.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-[#4B164C] mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">3</span>
                Akun Pengguna & Otentikasi Google
              </h2>
              <p className="mb-3">
                Untuk menggunakan layanan E-Surat, pengguna dapat membuat akun menggunakan email/password atau menghubungkan akun Google melalui Google OAuth 2.0:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Pengguna bertanggung jawab untuk menjaga kerahasiaan kredensial login dan akun mereka.</li>
                <li>Pengguna wajib memberikan informasi yang akurat dan sah saat membuat akun atau mengisi formulir surat.</li>
                <li>Pengguna bertanggung jawab atas semua aktivitas yang terjadi di bawah akun mereka.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">4</span>
                Ketentuan Integrasi Google Drive & Google Sheets
              </h2>
              <p className="mb-3">
                Integrasi dengan layanan Google bergantung pada API resmi yang disediakan oleh Google LLC:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Dengan menghubungkan akun Google Anda, Anda memberikan izin kepada E-Surat untuk mengelola folder <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">esurat</code> dan lembar kerja Google Sheets atas nama Anda.</li>
                <li>Aplikasi E-Surat tidak menjamin ketersediaan layanan Google tanpa henti. Gangguan pada layanan Google, perubahan kuota API, atau pencabutan izin akses oleh pengguna dapat mempengaruhi fungsionalitas sinkronisasi dan pratinjau.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">5</span>
                Tanggung Jawab dan Hak Atas Konten
              </h2>
              <p className="mb-3">
                Pengguna mempertahankan hak kepemilikan penuh atas dokumen, berkas, dan informasi surat yang dimasukkan ke dalam sistem:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>E-Surat tidak mengklaim hak kepemilikan atas berkas atau data surat yang Anda simpan.</li>
                <li>Pengguna menjamin bahwa mereka memiliki hak legal untuk mengunggah, menyimpan, dan mengelola dokumen atau berkas yang dimasukkan ke aplikasi.</li>
                <li>Pengguna bertanggung jawab penuh untuk memverifikasi kebenaran dan ketepatan data yang diinput sebelum menyimpannya ke dalam Google Sheets atau Drive.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">6</span>
                Penggunaan yang Dilarang
              </h2>
              <p className="mb-3">Saat menggunakan aplikasi E-Surat, pengguna dilarang keras untuk:</p>
              <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-2 text-xs sm:text-sm text-red-900">
                <div className="flex items-start gap-2">
                  <i className="bi bi-x-circle-fill text-red-500 mt-0.5"></i>
                  <span>Mengakses atau mencoba mengakses akun, Google Drive, atau catatan surat milik pengguna lain tanpa wewenang sah.</span>
                </div>
                <div className="flex items-start gap-2">
                  <i className="bi bi-x-circle-fill text-red-500 mt-0.5"></i>
                  <span>Mengunggah berkas yang mengandung virus, malware, script berbahaya, atau konten yang melanggar hukum.</span>
                </div>
                <div className="flex items-start gap-2">
                  <i className="bi bi-x-circle-fill text-red-500 mt-0.5"></i>
                  <span>Mencoba menerobos mekanisme keamanan, melakukan manipulasi API, atau mengganggu stabilitas server E-Surat.</span>
                </div>
                <div className="flex items-start gap-2">
                  <i className="bi bi-x-circle-fill text-red-500 mt-0.5"></i>
                  <span>Menggunakan aplikasi untuk kegiatan ilegal atau pelanggaran hak kekayaan intelektual pihak ketiga.</span>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">7</span>
                Ketersediaan dan Batasan Tanggung Jawab
              </h2>
              <p className="mb-3">
                Layanan E-Surat disediakan berdasarkan asas <strong>"AS IS" (sebagaimana adanya)</strong> dan <strong>"AS AVAILABLE" (sebagaimana tersedia)</strong>:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Pengelola tidak menjamin bahwa layanan akan selalu bebas dari kesalahan (error-free) atau gangguan teknis.</li>
                <li>Pengelola tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data, atau kegagalan akses yang disebabkan oleh gangguan server, pemadaman jaringan, atau kendala API pihak ketiga (Google Services).</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">8</span>
                Penghentian Akses (Termination)
              </h2>
              <p>
                Pengelola berhak untuk menangguhkan atau menghentikan akses akun pengguna apabila ditemukan pelanggaran terhadap Syarat dan Ketentuan ini, indikasi penyalahgunaan sistem, atau tindakan yang membahayakan keamanan platform E-Surat.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">9</span>
                Kebijakan Privasi
              </h2>
              <p>
                Penggunaan data pribadi Anda diatur oleh Kebijakan Privasi E-Surat yang terpisah. Dengan menggunakan layanan ini, Anda menyetujui pengumpulan dan penggunaan data sesuai dengan kebijakan privasi yang berlaku.
              </p>
            </section>

            {/* Section 10 */}
            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">10</span>
                Hubungi Kami
              </h2>
              <p className="mb-3">
                Pertanyaan atau klarifikasi mengenai Syarat dan Ketentuan Layanan ini dapat disampaikan melalui kontak berikut:
              </p>
              <div className="p-4 bg-slate-100 rounded-xl text-xs sm:text-sm font-mono text-slate-800 space-y-1">
                <div><strong>Email Kontak:</strong> <span className="text-slate-600">e33965238@gmail.com</span></div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} E-Surat · All rights reserved.</div>
          <div className="flex items-center gap-4 font-medium">
            <Link to="/privacy-policy" className="hover:text-[#4B164C] transition">Privacy Policy</Link>
            <span>•</span>
            <Link to="/" className="hover:text-[#4B164C] transition">Beranda</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
