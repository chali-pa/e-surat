import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy | E-Surat'
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
              Kebijakan Privasi (Privacy Policy)
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
                Pengantar
              </h2>
              <p className="mb-3">
                Selamat datang di <strong>E-Surat (Sistem Manajemen Surat)</strong>. Kebijakan Privasi ini menjelaskan bagaimana aplikasi E-Surat yang dioperasikan oleh <span className="font-semibold text-slate-800">[OPERATOR_NAME_PLACEHOLDER]</span> mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda saat Anda menggunakan aplikasi ini.
              </p>
              <p>
                Aplikasi E-Surat dirancang khusus untuk mempermudah pencatatan, pengorganisasian, pratinjau (preview), pencetakan (print), serta pengarsipan Surat Masuk dan Surat Keluar secara digital dengan memanfaatkan integrasi Google OAuth, Google Drive, dan Google Sheets.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">2</span>
                Informasi yang Kami Kumpulkan
              </h2>
              <p className="mb-3">
                Kami hanya mengumpulkan data dan informasi yang benar-benar diperlukan untuk menjalankan fungsi utama aplikasi E-Surat:
              </p>
              
              <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-purple-200 my-4">
                <div>
                  <strong className="text-slate-800 block mb-1">A. Informasi Akun Pengguna:</strong>
                  Nama lengkap, alamat email, dan kata sandi yang terenkripsi (untuk pendaftaran langsung), atau identifier akun Google (Google User ID) dan email utama saat Anda masuk menggunakan Google OAuth.
                </div>
                <div>
                  <strong className="text-slate-800 block mb-1">B. Data Surat dan Formulir:</strong>
                  Informasi surat yang dimasukkan pengguna melalui formulir aplikasi, meliputi: Nomor Surat, Nama Pengirim (Surat Masuk), Nama Penerima (Surat Keluar), Perihal/Nama Surat, Tanggal Masuk/Keluar, dan Tanggal Pembuatan Surat.
                </div>
                <div>
                  <strong className="text-slate-800 block mb-1">C. Berkas Dokumen (Attachments):</strong>
                  File dokumen fisik surat yang Anda unggah (seperti format PDF, Excel XLSX/XLS/CSV, Word DOC/DOCX, dan Gambar PNG/JPG/JPEG/WEBP) untuk keperluan penyimpanan, pratinjau, dan pencetakan.
                </div>
                <div>
                  <strong className="text-slate-800 block mb-1">D. Informasi Sesi Aplikasi:</strong>
                  Token autentikasi aman (JWT) yang disimpan di penyimpanan lokal peramban (browser local storage) untuk menjaga status kredensial login Anda selama sesi aktif.
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">3</span>
                Otentikasi Google OAuth 2.0
              </h2>
              <p className="mb-3">
                Aplikasi E-Surat mendukung otentikasi melalui Google OAuth 2.0. Saat Anda menghubungkan akun Google Anda:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Kami hanya meminta izin (scopes) minimum yang diperlukan untuk otentikasi dan pengoperasian fitur integrasi.</li>
                <li>Identitas Google Anda digunakan untuk memverifikasi akun dan memastikan bahwa data surat Anda terhubung secara aman ke akun yang tepat.</li>
                <li>Kredensial dan token OAuth (access token & refresh token) diproses dan disimpan secara aman di sisi server (server-side). Kredensial rahasia tidak pernah diekspos ke kode peramban publik.</li>
                <li>Anda dapat mencabut (revoke) akses E-Surat kapan saja melalui Pengaturan Keamanan Akun Google Anda di <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#4B164C] underline font-semibold hover:text-[#DD88CF]">myaccount.google.com/permissions</a>.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">4</span>
                Integrasi Google Drive
              </h2>
              <p className="mb-3">
                E-Surat menggunakan Google Drive pengguna yang terhubung untuk menyimpan dan mengorganisir dokumen surat secara otomatis:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li><strong>Struktur Folder `esurat`:</strong> Aplikasi membuat dan mengelola folder utama bernama <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">esurat</code> pada Google Drive Anda.</li>
                <li><strong>Sub-Folder Otomatis:</strong> Di dalam folder tersebut, aplikasi mengelompokkan berkas ke dalam sub-folder <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">incoming</code> (Surat Masuk) dan <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">outgoing</code> (Surat Keluar), serta menyusunnya ke dalam folder bulanan (Januari hingga Desember).</li>
                <li>Aplikasi hanya mengakses dan mengelola berkas dokumen surat yang Anda unggah dan kelola melalui aplikasi E-Surat. Aplikasi tidak membaca atau mengakses dokumen pribadi Anda yang lain di luar lingkup aplikasi.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">5</span>
                Integrasi Google Sheets
              </h2>
              <p className="mb-3">
                E-Surat melakukan sinkronisasi data arsip surat ke Google Spreadsheet di akun pengguna:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Aplikasi membuat dan memperbarui lembar kerja bernama <strong>E-Surat Masuk</strong> dan <strong>E-Surat Keluar</strong>.</li>
                <li>Setiap penambahan atau perubahan data surat di aplikasi akan memperbarui baris data pada Google Spreadsheet yang bersangkutan.</li>
                <li>Kolom tautan file diisi dengan formula tautan langsung (<code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono">=HYPERLINK(...)</code>) yang dapat diklik untuk membuka berkas asli langsung di Google Drive.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">6</span>
                Tujuan Penggunaan Informasi
              </h2>
              <p className="mb-3">
                Informasi yang dikumpulkan digunakan semata-mata untuk tujuan operasional berikut:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 my-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <strong className="text-slate-900 text-xs uppercase tracking-wider block mb-1">Otentikasi & Keamanan</strong>
                  Memverifikasi identitas pengguna dan melindungi akun dari akses yang tidak sah.
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <strong className="text-slate-900 text-xs uppercase tracking-wider block mb-1">Manajemen Arsip Surat</strong>
                  Menyimpan, menampilkan, memperbarui, dan menghapus catatan surat masuk dan keluar.
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <strong className="text-slate-900 text-xs uppercase tracking-wider block mb-1">Pratinjau & Pencetakan</strong>
                  Menyajikannya dalam modal Preview internal dan mengisolasi tampilan Print untuk pencetakan bersih.
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <strong className="text-slate-900 text-xs uppercase tracking-wider block mb-1">Sinkronisasi Cloud</strong>
                  Menjaga kelangsungan data di Google Drive dan Google Sheets pengguna.
                </div>
              </div>
            </section>

            {/* Section 7 - Google API Limited Use */}
            <section className="bg-purple-50/60 border border-purple-100 rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-[#4B164C] mb-3 flex items-center gap-2">
                <i className="bi bi-shield-check text-xl"></i>
                Kepatuhan Penggunaan Terbatas Google API (Google API Limited Use)
              </h2>
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                Penggunaan dan pemindahan informasi yang diterima dari Google APIs oleh aplikasi E-Surat ke aplikasi lain akan mematuhi <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-[#4B164C] font-semibold underline">Google API Services User Data Policy</a>, termasuk persyaratan <strong>Limited Use</strong>. Data pengguna Google tidak pernah digunakan untuk keperluan periklanan, pemasaran, atau tujuan yang tidak berhubungan dengan fungsi aplikasi E-Surat.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">7</span>
                Keamanan dan Penyimpanan Data
              </h2>
              <p className="mb-3">
                Kami menerapkan tindakan keamanan teknis dan organisasional yang memadai untuk melindungi data Anda:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li>Kata sandi pengguna dienkripsi dengan algoritma hashing aman sebelum disimpan.</li>
                <li>Semua token rahasia Google OAuth, client secrets, dan kunci enkripsi disimpan eksklusif pada variabel lingkungan server dan tidak pernah dipublikasikan ke klien.</li>
                <li>Komunikasi API menggunakan protokol HTTPS terenkripsi.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">8</span>
                Pembagian Data dengan Pihak Ketiga
              </h2>
              <p className="mb-3">
                Kami <strong>tidak pernah menjual, menyewakan, atau memperdagangkan</strong> data pribadi atau dokumen Anda kepada pihak ketiga mana pun. Data hanya dibagikan dengan penyedia layanan Google yang terhubung (Google Drive API & Google Sheets API) sebatas yang diperlukan untuk menyediakan fitur aplikasi kepada Anda.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">9</span>
                Hak dan Kontrol Pengguna
              </h2>
              <p className="mb-3">Sebagai pengguna, Anda memiliki hak penuh atas data Anda:</p>
              <ul className="list-disc pl-6 space-y-1.5 marker:text-[#4B164C]">
                <li><strong>Mengakses & Memperbarui:</strong> Anda dapat melihat dan mengubah informasi surat Anda kapan saja melalui formulir Edit di aplikasi.</li>
                <li><strong>Menghapus Data:</strong> Saat Anda menghapus catatan surat dari aplikasi, sistem akan menghapus baris terkait di Google Sheets dan menghapus berkas dari Google Drive.</li>
                <li><strong>Mencabut Akses Google:</strong> Anda dapat memutuskan koneksi integrasi Google kapan saja dari akun Anda.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">10</span>
                Cookie dan Penyimpanan Sesi
              </h2>
              <p>
                Aplikasi ini menggunakan penyimpanan lokal peramban (localStorage) untuk menyimpan token autentikasi sesi login. Aplikasi ini tidak menggunakan cookie pelacak pihak ketiga atau alat analitik pemasaran.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">11</span>
                Perubahan Kebijakan Privasi
              </h2>
              <p>
                Kebijakan Privasi ini dapat diperbarui sewaktu-waktu apabila terdapat penyesuaian fungsi aplikasi atau ketentuan hukum yang berlaku. Perubahan akan berlaku serta-merta setelah Kebijakan Privasi yang diperbarui diunggah di halaman ini dengan tanggal pembaharuan terbaru.
              </p>
            </section>

            {/* Section 13 */}
            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#4B164C] text-xs flex items-center justify-center font-bold">12</span>
                Hubungi Kami
              </h2>
              <p className="mb-3">
                Jika Anda memiliki pertanyaan, saran, atau kendala terkait Kebijakan Privasi ini, silakan hubungi pengelola aplikasi melalui:
              </p>
              <div className="p-4 bg-slate-100 rounded-xl text-xs sm:text-sm font-mono text-slate-800 space-y-1">
                <div><strong>Pengelola:</strong> <span className="text-slate-600">[OPERATOR_NAME_PLACEHOLDER]</span></div>
                <div><strong>Email Kontak Privasi:</strong> <span className="text-slate-600">[CONTACT_EMAIL_PLACEHOLDER]</span></div>
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
            <Link to="/terms-of-service" className="hover:text-[#4B164C] transition">Terms of Service</Link>
            <span>•</span>
            <Link to="/" className="hover:text-[#4B164C] transition">Beranda</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
