# E-Surat — Production Deployment Guide

> **Last Updated:** 18 August 2026
> This document is the authoritative guide for deploying **E-Surat** to production on Vercel.
> It covers frontend, backend, Google OAuth, Google Drive, Google Sheets, database, and security configuration.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Google Cloud Console Setup](#3-google-cloud-console-setup)
4. [Database Setup (Supabase / PostgreSQL)](#4-database-setup)
5. [Repository Preparation](#5-repository-preparation)
6. [Backend Deployment (Vercel)](#6-backend-deployment)
7. [Frontend Deployment (Vercel)](#7-frontend-deployment)
8. [Linking Frontend ↔ Backend](#8-linking-frontend--backend)
9. [Configure Google OAuth Production URLs](#9-configure-google-oauth-production-urls)
10. [Production Testing Checklist](#10-production-testing-checklist)
11. [Security Checklist](#11-security-checklist)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Troubleshooting](#13-troubleshooting)
14. [Cost & Efficiency Notes](#14-cost--efficiency-notes)

---

## 1. Project Architecture

```
GitHub Repository
│
├── frontend/          ← React 18 + Vite 5   (deployed as Vercel Project A)
│   ├── src/
│   ├── public/
│   ├── vercel.json    ← SPA fallback rewrites, security headers
│   └── package.json
│
└── backend/           ← Node.js 20 + Express 4 + TypeScript (deployed as Vercel Project B)
    ├── src/
    ├── dist/          ← Compiled output (TypeScript → JavaScript)
    ├── vercel.json    ← Serverless function entry point
    └── package.json
```

### How They Communicate

```
Browser
  │
  ├─→ https://your-frontend.vercel.app    (Frontend — React SPA)
  │
  └─→ https://your-backend.vercel.app     (Backend — Express Serverless Function)
        │
        ├─→ PostgreSQL / Supabase         (Database)
        │
        ├─→ Google OAuth 2.0              (Authentication)
        │
        ├─→ Google Drive API v3           (Per-user file storage)
        │
        └─→ Google Sheets API v4          (Per-user spreadsheet sync)
```

### Key Design Principles

| Principle | Implementation |
|---|---|
| **Per-user data isolation** | Every user has their own Drive workspace and spreadsheet files |
| **Idempotent provisioning** | Drive folders and Sheets are created once and reused on subsequent logins |
| **Serverless compatible** | Backend exports Express `app`; `app.listen()` is skipped when `VERCEL=1` |
| **Secure token handling** | Google OAuth tokens are stored server-side only, never sent to the browser |

---

## 2. Prerequisites

Before deploying, prepare the following:

| Requirement | Description |
|---|---|
| **GitHub repository** | Push the entire project to a GitHub repository |
| **Vercel account** | Free tier is sufficient for most usage |
| **Google Cloud Console** | One Google Cloud project with Drive API and Sheets API enabled |
| **Google OAuth Credentials** | OAuth 2.0 Client ID and Client Secret |
| **PostgreSQL database** | Supabase free tier is recommended (supports SSL and connection pooling) |
| **reCAPTCHA v2** | Site Key (public) and Secret Key (server-side) from Google reCAPTCHA Admin |
| **SMTP access** | Gmail App Password for the password reset email feature |

---

## 3. Google Cloud Console Setup

### Step 3.1 — Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it (e.g., `esurat-production`) and click **Create**

### Step 3.2 — Enable Required APIs

In your project, go to **APIs & Services → Library** and enable:

- **Google Drive API**
- **Google Sheets API**

### Step 3.3 — Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** (for any Google account) or **Internal** (for G Suite/Workspace users only)
3. Fill in:
   - **App name:** E-Surat
   - **User support email:** your contact email
   - **Authorized domains:** `your-frontend.vercel.app`
4. Under **Scopes**, add:
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/spreadsheets`
5. For production, click **Publish App** (external users) or keep in testing with test user emails

### Step 3.4 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Select **Web application**
3. Name it (e.g., `E-Surat Web`)
4. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:5173
   https://your-frontend.vercel.app
   ```
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/google/callback
   https://your-backend.vercel.app/api/google/callback
   ```
6. Click **Create** and save the **Client ID** and **Client Secret**

> ⚠️ **IMPORTANT:** The `Authorized redirect URIs` must exactly match `GOOGLE_REDIRECT_URI` in the backend environment variable. Any mismatch causes `redirect_uri_mismatch` errors.

---

## 4. Database Setup

The application uses **PostgreSQL**. [Supabase](https://supabase.com/) is recommended for its free tier and serverless-friendly connection pooling.

### Step 4.1 — Create a Supabase Project

1. Go to [https://supabase.com/](https://supabase.com/) and sign up
2. Create a new project, noting the **Database Password**
3. Go to **Project Settings → Database** and copy the connection details

### Step 4.2 — Run Database Migrations

Connect to your Supabase database using the SQL Editor or a local client and run:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id                         SERIAL PRIMARY KEY,
  name                       VARCHAR(255) NOT NULL,
  email                      VARCHAR(255) UNIQUE NOT NULL,
  password                   VARCHAR(255) NOT NULL,
  email_verified_at          TIMESTAMP,
  google_sub                 VARCHAR(255),
  google_access_token        TEXT,
  google_refresh_token       TEXT,
  google_token_expires_at    BIGINT,
  google_connected           BOOLEAN DEFAULT FALSE,
  drive_folder_id            VARCHAR(255),
  drive_keluar_folder_id     VARCHAR(255),
  sheet_masuk_id             VARCHAR(255),
  sheet_keluar_id            VARCHAR(255),
  created_at                 TIMESTAMP DEFAULT NOW(),
  updated_at                 TIMESTAMP DEFAULT NOW()
);

-- Incoming mail (surat masuk)
CREATE TABLE IF NOT EXISTS surat (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nomor_surat       VARCHAR(255),
  tanggal_surat     DATE,
  tanggal_terima    DATE,
  pengirim          VARCHAR(500),
  perihal           VARCHAR(1000),
  keterangan        TEXT,
  file_path         TEXT,
  google_drive_id   VARCHAR(255),
  sheets_row        INTEGER,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Outgoing mail (surat keluar)
CREATE TABLE IF NOT EXISTS surat_keluar (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nomor_surat       VARCHAR(255),
  tanggal_surat     DATE,
  tanggal_kirim     DATE,
  tujuan            VARCHAR(500),
  perihal           VARCHAR(1000),
  keterangan        TEXT,
  file_path         TEXT,
  google_drive_id   VARCHAR(255),
  sheets_row        INTEGER,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

> ⚠️ **Do NOT run destructive migrations on a database that already contains production data.**

### Step 4.3 — Get Supabase Connection String

In Supabase → **Project Settings → Database → Connection string**, copy the **URI** (Transaction Pooler recommended for serverless):

```
postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

This goes into `DATABASE_URL` in Vercel environment variables (optional; individual `DB_*` vars also work).

---

## 5. Repository Preparation

### Step 5.1 — Verify .gitignore

Ensure the following are **never committed** to Git. Check `.gitignore` in the root, `frontend/`, and `backend/`:

```gitignore
# Environment variables
.env
.env.local
.env.production

# Build outputs
frontend/dist/
backend/dist/

# Dependencies
node_modules/

# Uploaded files (not persisted — Drive is the source of truth)
backend/uploads/

# Google service account files
*.json
*service-account*
*credentials*
*token-cache*
```

### Step 5.2 — Commit and Push

```bash
git status
git add .
git commit -m "chore: prepare for Vercel production deployment"
git push origin main
```

---

## 6. Backend Deployment

### Step 6.1 — Import Backend into Vercel

1. Go to [https://vercel.com/](https://vercel.com/) and log in
2. Click **"Add New → Project"**
3. Import your GitHub repository
4. Under **"Root Directory"**, set: `backend`
5. **Framework Preset:** Other
6. **Build Command:** `npm run build`
7. **Output Directory:** `dist`
8. **Install Command:** `npm install`
9. **Node.js Version:** 20.x

### Step 6.2 — Backend Environment Variables

In **Vercel → Project → Settings → Environment Variables**, add all variables below under **Production** scope:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `DB_HOST` | `db.your-ref.supabase.co` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `your_supabase_db_password` |
| `JWT_SECRET` | `your_long_random_jwt_secret` |
| `JWT_EXPIRES_IN` | `7d` |
| `GOOGLE_CLIENT_ID` | `your_google_oauth_client_id` |
| `GOOGLE_CLIENT_SECRET` | `your_google_oauth_client_secret` |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.vercel.app/api/google/callback` |
| `RECAPTCHA_SECRET_KEY` | `your_recaptcha_secret_key` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your_email@gmail.com` |
| `SMTP_PASSWORD` | `your_gmail_app_password` |
| `SMTP_FROM` | `E-Surat <noreply@esurat.com>` |

> ⚠️ **After adding or changing any environment variable, you must redeploy the project for changes to take effect.**

### Step 6.3 — Deploy

Click **"Deploy"** and wait for the build to complete.

### Step 6.4 — Verify Backend Health

After deployment, open:

```
https://your-backend.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-08-18T10:00:00.000Z"
}
```

If this doesn't respond, check the **Vercel → Deployments → Build Logs** for errors.

---

## 7. Frontend Deployment

### Step 7.1 — Import Frontend into Vercel

1. Click **"Add New → Project"**
2. Import the **same GitHub repository**
3. Under **"Root Directory"**, set: `frontend`
4. **Framework Preset:** Vite
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Install Command:** `npm install`
8. **Node.js Version:** 20.x

### Step 7.2 — Frontend Environment Variables

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.vercel.app` |
| `VITE_RECAPTCHA_SITE_KEY` | `your_recaptcha_site_key` |

> `VITE_*` variables are embedded into the JS bundle at build time. They are **not secret** — do not put Google Client Secret or JWT Secret in frontend variables.

### Step 7.3 — Deploy

Click **"Deploy"** and wait for completion.

### Step 7.4 — Verify Frontend

Open `https://your-frontend.vercel.app` in a browser. You should see the E-Surat landing page.

---

## 8. Linking Frontend ↔ Backend

After both deployments, update each project's environment variables with the actual deployed URLs:

**Backend project** (replace placeholder with actual frontend URL):
```
FRONTEND_URL = https://your-frontend.vercel.app
```

**Frontend project** (replace placeholder with actual backend URL):
```
VITE_API_BASE_URL = https://your-backend.vercel.app
```

Then **redeploy both projects** to apply the updated URLs.

---

## 9. Configure Google OAuth Production URLs

After deployment, return to **Google Cloud Console → Credentials → Your OAuth Client** and ensure these exact URLs are listed:

**Authorized JavaScript Origins:**
```
http://localhost:5173
https://your-frontend.vercel.app
```

**Authorized Redirect URIs:**
```
http://localhost:3000/api/google/callback
https://your-backend.vercel.app/api/google/callback
```

Also set the backend environment variable:
```
GOOGLE_REDIRECT_URI = https://your-backend.vercel.app/api/google/callback
```

> ⚠️ The URI in `GOOGLE_REDIRECT_URI` must be character-for-character identical to the URI registered in Google Cloud Console. Trailing slashes, different ports, or HTTP vs HTTPS differences will all cause `redirect_uri_mismatch`.

---

## 10. Production Testing Checklist

After both projects are deployed and environment variables are configured, test the full workflow:

### Core Functionality
- [ ] Frontend homepage loads at `https://your-frontend.vercel.app`
- [ ] Backend health endpoint responds at `https://your-backend.vercel.app/api/health`
- [ ] Frontend can reach backend (no CORS errors in browser console)

### Authentication
- [ ] Email/password registration works
- [ ] Email/password login works
- [ ] **"Sign in with Google"** button opens Google OAuth correctly
- [ ] New Google user can complete registration
- [ ] Existing Google user can sign in without creating a duplicate account
- [ ] Google login redirects back to dashboard successfully
- [ ] Logout works

### Per-User Google Drive Provisioning
- [ ] After first Google login, user's `esurat` folder appears in their Google Drive
- [ ] `esurat-keluar` folder appears in their Google Drive
- [ ] 12 monthly folders (`01-26` through `12-26`) appear inside each root folder
- [ ] `Excel`, `Photos`, `PDF` subfolders exist inside each monthly folder
- [ ] `E-Surat Masuk` spreadsheet is created in the user's Google Drive
- [ ] `E-Surat Keluar` spreadsheet is created in the user's Google Drive
- [ ] Database record for user contains correct Drive folder IDs and sheet IDs

### Idempotency
- [ ] Logging out and logging in again with same Google account does **not** create duplicate folders
- [ ] Logging out and logging in again does **not** create duplicate spreadsheets

### Multi-User Isolation
- [ ] Second Google account creates completely separate Drive workspace
- [ ] User A cannot see User B's records in the dashboard
- [ ] User A cannot access User B's Drive files through the API

### Core Application Workflows
- [ ] **Create**: Adding a new Surat Masuk saves to database, uploads to Drive, and appends to Google Sheets
- [ ] **Create**: Adding a new Surat Keluar works the same way
- [ ] **Edit**: Editing a record updates the database and the correct Google Sheets row
- [ ] **Delete**: Deleting a record removes it from the database and Google Sheets
- [ ] **Preview**: Clicking Preview opens the document from Google Drive without error
- [ ] **Print**: Print function outputs only the document without application UI

### Public Pages
- [ ] `/privacy-policy` loads without login
- [ ] `/terms-of-service` loads without login

---

## 11. Security Checklist

- [ ] `.env` files are **not** in the Git repository
- [ ] Google Client Secret is not in frontend code or environment variables
- [ ] Google refresh tokens are stored in the database, never sent to the browser
- [ ] `JWT_SECRET` is a long random string (≥ 32 characters) and is not guessable
- [ ] HTTPS is used for all production URLs (Vercel provides this automatically)
- [ ] CORS is restricted to known frontend origins only
- [ ] OAuth state parameter is validated in the callback to prevent CSRF
- [ ] All API routes that modify data require `Authorization: Bearer <token>` header
- [ ] User ownership is verified before any Drive, Sheets, or database operation
- [ ] Google resource IDs from client requests are never blindly trusted without DB lookup
- [ ] No tokens, passwords, or private keys are logged to Vercel function logs
- [ ] Supabase database is not publicly exposed (Row-Level Security enabled if needed)
- [ ] `RECAPTCHA_SECRET_KEY` is in backend variables only
- [ ] Rate limiting (`express-rate-limit`) is active on `/api/*` routes

---

## 12. Environment Variables Reference

### Backend Variables (set in Vercel → Backend Project → Settings → Environment Variables)

| Variable | Purpose | Secret? | Required |
|---|---|---|---|
| `NODE_ENV` | Runtime environment (`production`) | No | Yes |
| `FRONTEND_URL` | CORS and OAuth redirect origin | No | Yes |
| `DB_HOST` | PostgreSQL host | Yes | Yes |
| `DB_PORT` | PostgreSQL port | No | Yes |
| `DB_NAME` | PostgreSQL database name | No | Yes |
| `DB_USER` | PostgreSQL username | Yes | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes | Yes |
| `JWT_SECRET` | JWT token signing key | Yes | Yes |
| `JWT_EXPIRES_IN` | JWT expiry duration (e.g. `7d`) | No | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | No (but keep private) | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (must match Google Console) | No | Yes |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v2 server-side secret | Yes | Yes |
| `SMTP_HOST` | SMTP server host | No | For email reset |
| `SMTP_PORT` | SMTP server port | No | For email reset |
| `SMTP_USER` | SMTP login email | No | For email reset |
| `SMTP_PASSWORD` | SMTP password / App Password | Yes | For email reset |
| `SMTP_FROM` | Sender display name and email | No | For email reset |

### Frontend Variables (set in Vercel → Frontend Project → Settings → Environment Variables)

| Variable | Purpose | Secret? | Required |
|---|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | No | Yes |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v2 site key (public) | No | Yes |

---

## 13. Troubleshooting

### 🔴 `redirect_uri_mismatch`

**Cause:** The `GOOGLE_REDIRECT_URI` in the backend does not exactly match an Authorized Redirect URI in Google Cloud Console.

**Fix:**
1. Open Google Cloud Console → Credentials → your OAuth Client
2. Ensure `https://your-backend.vercel.app/api/google/callback` is listed exactly
3. Update `GOOGLE_REDIRECT_URI` in Vercel backend environment variables to match
4. Redeploy backend

---

### 🔴 Refresh Token Expired / Revoked

```
Google OAuth authentication failed: the refresh token is expired or revoked
```

**Cause:** The user's stored Google refresh token was revoked (e.g., user removed app from their Google Account, or the token expired due to inactivity for >6 months with external OAuth consent screen).

**Fix:**
1. The backend returns HTTP 401 with `error_code: GOOGLE_RECONNECT_REQUIRED`
2. The frontend should redirect the user to `/api/google/connect` to re-authorize
3. After re-authorization, new tokens are stored and operations resume
4. Do **not** store raw tokens in frontend code or localStorage

---

### 🔴 CORS Error in Browser

```
Access to XMLHttpRequest at 'https://your-backend.vercel.app' from origin
'https://your-frontend.vercel.app' has been blocked by CORS policy
```

**Fix:**
1. Verify `FRONTEND_URL` is set to the exact frontend origin (no trailing slash) in the backend Vercel environment variables
2. Redeploy backend after changing `FRONTEND_URL`
3. Check that the browser console shows the correct `Origin` header

---

### 🔴 API 404 — Route Not Found

**Cause:** The frontend is calling a URL that doesn't match any backend route, or the `VITE_API_BASE_URL` is incorrect.

**Fix:**
1. Check `VITE_API_BASE_URL` in the frontend Vercel environment variables
2. Verify it points to the backend deployment URL (not the frontend URL)
3. Redeploy frontend after correcting the variable
4. Check the Vercel backend build logs to verify `dist/index.js` was compiled correctly

---

### 🔴 Environment Variable Not Applied

**Cause:** Vercel environment variable changes do not apply until the project is redeployed.

**Fix:**
1. After changing any environment variable in Vercel → Settings → Environment Variables
2. Go to Vercel → Deployments → click **"Redeploy"** on the latest deployment
3. Confirm the variable is scoped to **Production** (not only Preview or Development)

---

### 🔴 Preview — "Failed to Load Preview" / "File not found in Google Drive"

**Cause:** Multiple possible causes:

| Cause | Fix |
|---|---|
| `VITE_API_BASE_URL` is wrong | Verify frontend env var, redeploy |
| User's Drive file was deleted | Re-upload the file |
| Refresh token expired | Re-authorize via Google OAuth |
| `google_drive_id` missing in DB | Check if upload succeeded during create/edit |
| CORS blocking file fetch | Verify backend CORS and `FRONTEND_URL` |

---

### 🔴 Database Connection Failed

**Cause:** Incorrect DB credentials or SSL configuration.

**Fix:**
1. Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in Vercel backend environment variables
2. Supabase requires SSL — the backend automatically applies `ssl: { rejectUnauthorized: false }` when the host contains `supabase.com`
3. Check Vercel function logs for the specific error message

---

### 🔴 Vercel Build Failed — TypeScript Error

**Fix:**
1. Check **Vercel → Deployments → Build Logs**
2. Reproduce locally: run `npm run build` in `backend/`
3. Fix TypeScript errors in source and push again

---

## 14. Cost & Efficiency Notes

| Service | Free Tier Limit | Notes |
|---|---|---|
| **Vercel Frontend** | Unlimited bandwidth, 100GB/month | React SPA is static — minimal cost |
| **Vercel Backend** | 100GB-hours/month serverless execution | Scales to zero when idle |
| **Supabase** | 500MB database, 1GB file storage | Upgrade only if data grows large |
| **Google Drive API** | 10,000 requests/100 seconds, 1B/day | Per-user quotas are per OAuth token |
| **Google Sheets API** | 300 requests/minute | Sufficient for normal usage |

### Cost Optimization Practices Applied

- **Stored Drive/Sheet resource IDs in database** — eliminates repeated Drive folder searches
- **Idempotent provisioning** — no duplicate API calls or duplicate resources created
- **Serverless backend** — zero cost when not serving requests
- **Per-user OAuth tokens** — Google API quota is attributed to each user, not a shared service account
- **Static frontend** — served from Vercel CDN at near-zero cost
- **Connection pooling** — Supabase Transaction Pooler reduces database connection overhead

---

## Quick Reference — Common Commands

```bash
# Local development — backend
cd backend
npm run dev                    # Start dev server (tsx watch)
npm run build                  # Compile TypeScript to dist/

# Local development — frontend
cd frontend
npm run dev                    # Start Vite dev server
npm run build                  # Production build to dist/

# Database migration
cd backend
npm run migrate                # Run schema migrations

# Verify health locally
curl http://localhost:3000/api/health
```

---

*This document was generated for the E-Surat production deployment. Replace all `your-*` placeholders with actual values before use. Do not commit real secrets to Git.*
