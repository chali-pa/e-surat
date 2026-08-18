# E-Surat - Panduan Instalasi dan Penggunaan

E-Surat adalah sistem manajemen surat digital dengan arsitektur modern menggunakan React + Vite untuk frontend dan Express.js untuk backend API.

## 🏗️ Arsitektur Aplikasi

```
React + Vite (Frontend)
        │
        ▼ Axios
Express.js + TypeScript (Backend API)
        │
        ├── JWT Authentication
        ├── Document CRUD (Surat Masuk/Keluar)
        ├── File Upload
        ├── Per-User Google OAuth 2.0
        ├── Google Drive API (per-user)
        ├── Google Sheets API (per-user)
        └── Supabase PostgreSQL (Database)
```

### Teknologi yang Digunakan

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript (API-only)
- **Database**: Supabase PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Integrasi**: Per-User Google OAuth 2.0, Google Drive, Google Sheets, reCAPTCHA

### Catatan Penting: Google Integration

Aplikasi menggunakan **per-user OAuth 2.0 authentication** untuk Google Drive dan Google Sheets. Setiap pengguna menghubungkan akun Google mereka sendiri, dan token OAuth mereka disimpan secara aman di database. Pendekatan ini memungkinkan pengguna menggunakan penyimpanan Google Drive pribadi mereka (15GB) untuk file surat.

## � Environment Variables

Aplikasi ini menggunakan environment variables terpisah untuk frontend dan backend. Keduanya **tetap menggunakan environment variables** untuk konfigurasi.

### Backend Environment Variables (Express.js)

File: `backend/.env`

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (untuk CORS)
FRONTEND_URL=http://localhost:5173

# Supabase PostgreSQL Database
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Google OAuth 2.0 (Per-User Authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Catatan: Service account settings di bawah ini sudah DEPRECATED
# Aplikasi sekarang menggunakan per-user OAuth 2.0 authentication
# Setiap pengguna menghubungkan akun Google mereka sendiri
# GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
# GOOGLE_PRIVATE_KEY=your_private_key
# GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id
# GOOGLE_SHEET_ID=your_sheet_id
# GOOGLE_SHEET_NAME=Sheet1
# GOOGLE_SHEET_KELUAR_ID=your_sheet_keluar_id
# GOOGLE_SHEET_KELUAR_NAME=Sheet1

# reCAPTCHA (Server-side verification)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Email Configuration (untuk password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=E-Surat <noreply@esurat.com>
```

### Frontend Environment Variables (React + Vite)

File: `frontend/.env`

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:3000

# reCAPTCHA (Client-side)
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### Cara Environment Variables Bekerja

1. **Backend (Express.js)**:
   - Menggunakan `dotenv` package untuk memuat environment variables dari `.env`
   - Variables diakses dengan `process.env.VARIABLE_NAME`
   - Digunakan untuk konfigurasi server, database, JWT, dan integrasi eksternal

2. **Frontend (React + Vite)**:
   - Vite otomatis memuat variables yang diawali dengan `VITE_` dari `.env`
   - Variables diakses dengan `import.meta.env.VARIABLE_NAME`
   - Hanya variables yang diawali dengan `VITE_` yang tersedia di browser (security)

### Security Notes

- **Jangan commit file `.env` ke version control**
- File `.env.example` disediakan sebagai template
- Di production, gunakan environment variables dari platform hosting (Vercel, dll)
- Backend variables tidak terekspos ke browser
- Frontend variables dengan prefix `VITE_` akan terekspos ke browser, jangan simpan secret keys di sana

## �📋 Persyaratan Sistem

### Backend (Express.js)
- Node.js >= 18
- npm atau yarn
- TypeScript

### Frontend (React)
- Node.js >= 18
- npm atau yarn

### Database
- Akun Supabase dengan project PostgreSQL

## 🚀 Panduan Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd HIHIHI
```

### 2. Setup Backend (Express.js)

#### 2.1 Install Dependencies

```bash
cd backend
npm install
```

#### 2.2 Konfigurasi Environment

Salin file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Konfigurasi environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Supabase PostgreSQL
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password

# JWT Secret
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-vercel-domain.vercel.app/auth/google/callback

# Google Drive & Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_SHEET_KELUAR_ID=your_sheet_keluar_id
GOOGLE_SHEET_KELUAR_NAME=Sheet1

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Email (untuk password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=E-Surat <noreply@esurat.com>
```

#### 2.3 Setup Database (Supabase)

1. **Buat Project di Supabase**
   - Daftar di [supabase.com](https://supabase.com)
   - Buat project baru
   - Catat kredensial dari Settings > Database

2. **Jalankan Migrasi Database**

   Buka SQL Editor di Supabase Dashboard dan jalankan script dari `backend/migrations/init.sql`, atau gunakan psql:

   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f backend/migrations/init.sql
   ```

#### 2.4 Konfigurasi Google Services

Untuk menggunakan fitur Google Drive, Google Sheets, dan Google OAuth, ikuti panduan lengkap di `backend/OAUTH_SETUP.md`.

**Ringkasan Langkah:**
1. Buat Google Cloud Project
2. Enable Google Drive API dan Google Sheets API
3. Konfigurasi OAuth Consent Screen
4. Buat OAuth 2.0 Credentials (Web application)
5. Tambahkan environment variables ke `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
6. Setiap pengguna akan menghubungkan akun Google mereka sendiri melalui aplikasi

**Penting**: Untuk Google OAuth:
1. Buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/)
2. Application type: Web application
3. Authorized redirect URI: `http://localhost:3000/api/google/callback` (development)
4. Authorized redirect URI: `https://your-backend-domain.vercel.app/api/google/callback` (production)
5. Tambahkan URI ini ke Google Cloud Console untuk development dan production

### 3. Setup Frontend (React)

#### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

#### 3.2 Konfigurasi Environment Frontend

Salin file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Konfigurasi default di `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_RECAPTCHA_SITE_KEY=your_site_key
```

#### 3.3 Build Assets (Opsional untuk Production)

```bash
npm run build
```

## 🚀 Mode Production

### Deployment dengan Vercel (Express.js Backend)

#### 1. Konfigurasi Vercel untuk Backend

File `vercel.json` sudah disertakan di folder `backend` dengan konfigurasi:
- Build command untuk TypeScript
- Output directory
- Environment variables

#### 2. Environment Variables di Vercel

Di Vercel Dashboard > Settings > Environment Variables, tambahkan untuk backend:

```
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend-domain.vercel.app/api/google/callback
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

#### 3. Deploy Backend ke Vercel

```bash
cd backend
vercel
```

Ikuti instruksi Vercel untuk:
- Link ke project Vercel
- Set production domain
- Configure environment variables

### Deployment dengan Vercel (React Frontend)

#### 1. Konfigurasi Vercel

Buat file `vercel.json` di folder `frontend`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "env": {
    "VITE_API_BASE_URL": "@api_base_url"
  }
}
```

#### 2. Environment Variables di Vercel

Di Vercel Dashboard > Settings > Environment Variables, tambahkan untuk frontend:

```
VITE_API_BASE_URL=https://your-backend-domain.vercel.app
VITE_RECAPTCHA_SITE_KEY=your_production_recaptcha_site_key
```

#### 3. Deploy ke Vercel

```bash
cd frontend
vercel
```

Ikuti instruksi Vercel untuk:
- Link ke project Vercel
- Set production domain
- Configure environment variables

#### 4. Update CORS di Express.js

Setelah deploy ke Vercel, update `src/index.ts` di Express.js backend untuk mengizinkan domain Vercel:

```typescript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://your-frontend-domain.vercel.app',
    'https://*.vercel.app',
    'https://*.vercel.com',
  ],
  credentials: true,
}));
```

## 🎯 Menjalankan Aplikasi

### Mode Development

#### 1. Jalankan Backend (Express.js)

Buka terminal di folder `backend`:

```bash
cd backend
npm run dev
```

Backend akan berjalan di: `http://localhost:3000`

#### 2. Jalankan Frontend (React)

Buka terminal baru di folder `frontend`:

```bash
cd frontend
npm run dev
```

Frontend akan berjalan di: `http://localhost:5173`

#### 3. Akses Aplikasi

Buka browser dan akses:
- **Landing Page**: `http://localhost:5173`
- **Login**: `http://localhost:5173/login`
- **Dashboard**: `http://localhost:5173/dashboard` (setelah login)

### Mode Production

#### 1. Build Frontend

```bash
cd frontend
npm run build
```

#### 2. Konfigurasi Laravel untuk Serve React

Update `public/index.php` untuk serve file build React, atau gunakan web server (Nginx/Apache) untuk serve React build dan proxy API ke Laravel.

#### 3. Jalankan Laravel

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## 🔐 Fitur Keamanan

### reCAPTCHA

Aplikasi menggunakan Google reCAPTCHA untuk login dan registrasi. Pastikan:
1. Site key dan Secret key sudah dikonfigurasi di `.env`
2. Site key juga dikonfigurasi di `frontend/.env` sebagai `VITE_RECAPTCHA_SITE_KEY`

## 📁 Struktur Project

```
HIHIHI/
├── backend/                    # Express.js Backend API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts     # Supabase PostgreSQL connection
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── profileController.ts
│   │   │   ├── suratController.ts
│   │   │   ├── suratKeluarController.ts
│   │   │   └── googleController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT authentication
│   │   │   └── upload.ts       # File upload handling
│   │   ├── models/
│   │   │   └── User.ts         # User model
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── surat.ts
│   │   │   ├── suratKeluar.ts
│   │   │   ├── profile.ts
│   │   │   └── google.ts
│   │   └── index.ts            # Main Express server
│   ├── migrations/
│   │   └── init.sql            # Database schema
│   ├── .env.example            # Backend environment template
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # TypeScript config
│   └── vercel.json             # Vercel deployment config
├── frontend/                   # React + Vite Frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.ts        # Axios configuration
│   │   ├── components/
│   │   │   ├── GoogleIntegration.jsx
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── GoogleCallback.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SuratMasuk.jsx
│   │   │   ├── SuratKeluar.jsx
│   │   │   └── Profile.jsx
│   │   └── App.jsx             # Main React app
│   ├── .env.example            # Frontend environment template
│   ├── index.html              # HTML entry point
│   ├── package.json            # Frontend dependencies
│   ├── tailwind.config.js      # Tailwind CSS config
│   ├── vite.config.js          # Vite config
│   └── vercel.json             # Vercel deployment config
├── .gitignore                  # Git ignore rules
└── README_ID.md               # Dokumentasi (Bahasa Indonesia)
```

## 🌐 API Endpoints

### Authentication
- `POST /api/login` - Login user
- `POST /api/register` - Register user
- `POST /api/logout` - Logout user
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password

### Surat Masuk
- `GET /api/surat` - List surat masuk
- `POST /api/surat` - Create surat masuk
- `GET /api/surat/{id}` - Get surat masuk detail
- `PUT /api/surat/{id}` - Update surat masuk
- `DELETE /api/surat/{id}` - Delete surat masuk

### Surat Keluar
- `GET /api/surat-keluar` - List surat keluar
- `POST /api/surat-keluar` - Create surat keluar
- `GET /api/surat-keluar/{id}` - Get surat keluar detail
- `PUT /api/surat-keluar/{id}` - Update surat keluar
- `DELETE /api/surat-keluar/{id}` - Delete surat keluar

### Google Integration
- `GET /api/google/connect` - Connect Google account (OAuth flow)
- `GET /api/google/callback` - Google OAuth callback
- `POST /api/google/disconnect` - Disconnect Google account

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile

## 🔧 Troubleshooting

### Frontend tidak bisa mengakses API

1. Pastikan Express.js server berjalan di port 3000
2. Cek konfigurasi CORS di `backend/src/index.ts`
3. Pastikan `VITE_API_BASE_URL` di `frontend/.env` benar

### Koneksi Database Supabase Gagal

1. Pastikan kredensial Supabase di `backend/.env` benar
2. Cek apakah project Supabase aktif
3. Pastikan SSL mode di `backend/src/config/database.ts` sesuai dengan kebutuhan Supabase
4. Cek console log untuk error database

### Google OAuth tidak berfungsi

1. Pastikan redirect URI di Google Cloud Console sesuai dengan `GOOGLE_REDIRECT_URI` di `.env`
2. Cek log Express.js untuk error OAuth
3. Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` sudah diisi
4. Untuk development, pastikan user ditambahkan sebagai test user di OAuth consent screen
5. Lihat panduan lengkap di `backend/OAUTH_SETUP.md`

### reCAPTCHA tidak muncul

1. Pastikan script reCAPTCHA sudah dimuat di `frontend/index.html`
2. Cek `VITE_RECAPTCHA_SITE_KEY` di `frontend/.env`
3. Pastikan site key valid untuk domain yang digunakan

### File upload tidak berfungsi

1. Pastikan folder `backend/uploads` ada dan writable
2. Cek konfigurasi multer di `backend/src/middleware/upload.ts`
3. Pastikan file type yang diupload sesuai dengan filter

### JWT Token tidak valid

1. Pastikan `JWT_SECRET` di `backend/.env` sudah diisi
2. Cek apakah token sudah expired
3. Pastikan token dikirim dengan format `Bearer <token>` di header Authorization

## 📝 Catatan Penting

1. **Database**: Database Supabase akan dipertahankan. Jalankan migrasi SQL dari `backend/migrations/init.sql` untuk setup awal.
2. **Google Services**: Aplikasi menggunakan per-user OAuth 2.0 authentication. Setiap pengguna menghubungkan akun Google mereka sendiri melalui aplikasi. Lihat `backend/OAUTH_SETUP.md` untuk panduan lengkap.
3. **Environment Variables**: Selalu gunakan `.env.example` sebagai referensi untuk konfigurasi environment.
4. **Security**: Jangan commit file `.env` ke version control.
5. **JWT Tokens**: Token JWT disimpan di client-side (localStorage/cookies) dan dikirim di header Authorization.
6. **Google OAuth Tokens**: Token OAuth (access token dan refresh token) disimpan di database per-user dan di-refresh secara otomatis.
7. **File Upload**: File yang diupload disimpan di folder `backend/uploads` dan bisa diakses via `/uploads` endpoint.

## 🤝 Kontribusi

Untuk kontribusi, silakan:
1. Fork repository
2. Buat branch fitur (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin fitur-baru`)
5. Buat Pull Request

## 📄 Lisensi

Aplikasi ini dilisensikan sesuai dengan lisensi proyek asli.

## 🆘 Bantuan

Jika mengalami masalah:
1. Cek console browser untuk error frontend
2. Pastikan semua environment variable sudah dikonfigurasi dengan benar
3. Restart server Laravel dan React setelah perubahan konfigurasi
