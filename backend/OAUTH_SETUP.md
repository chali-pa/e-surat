# OAuth 2.0 Setup Instructions for E-Surat

## Overview

E-Surat uses **per-user OAuth 2.0 authentication** for Google Drive and Google Sheets integration. Each user connects their own Google account, and their OAuth tokens are stored securely in the database. This approach allows users to use their personal Google Drive storage (15GB) for letter files.

## How It Works

1. **Per-User Authentication**: Each user connects their own Google account through the OAuth flow
2. **Token Storage**: OAuth tokens (access token and refresh token) are stored per-user in the database
3. **Automatic Token Refresh**: The system automatically refreshes expired access tokens using the stored refresh token
4. **User-Specific Storage**: Files are uploaded to each user's connected Google Drive account

## Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" > "New Project"
3. Name it: `E-Surat`
4. Click "Create"

### Step 2: Enable Google APIs

1. In the Google Cloud Console, select your new project
2. Go to "APIs & Services" > "Library"
3. Search for and enable:
   - **Google Drive API**
   - **Google Sheets API**

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose user type:
   - **Development**: "External" (for testing)
   - **Production**: "External" (requires verification for sensitive scopes)
3. Fill in required fields:
   - App name: `E-Surat`
   - User support email: your email
   - Developer contact email: your email
4. Click "Save and Continue" through all steps (skip optional fields)
5. For development, add test users in the "Test users" section
6. For production, you'll need to publish the app and complete Google's verification process

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: **Web application**
4. Name: `E-Surat Web Client`
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/google/callback`
   - Production: `https://your-backend-domain.vercel.app/api/google/callback`
6. Click "Create"
7. **IMPORTANT**: Copy the Client ID and Client Secret

### Step 5: Update .env File

Add these lines to your `backend/.env` file:

```env
# OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

**Note**: The redirect URI must match exactly what you configured in Google Cloud Console.

### Step 6: User Connection Flow

Users connect their Google accounts through the application:

1. User clicks "Connect Google Account" in their profile
2. User is redirected to Google's OAuth consent screen
3. User authorizes the application with the following scopes:
   - `https://www.googleapis.com/auth/userinfo.profile` - User profile info
   - `https://www.googleapis.com/auth/userinfo.email` - User email
   - `https://www.googleapis.com/auth/drive` - Google Drive access
   - `https://www.googleapis.com/auth/spreadsheets` - Google Sheets access
4. Google redirects back to the application with an authorization code
5. Application exchanges the code for access and refresh tokens
6. Tokens are stored in the database for that user

### Step 7: Google Drive and Sheets Setup

Each user needs to set up their own Google Drive folder and Sheets:

#### Google Drive Setup

1. User creates a folder in their Google Drive (e.g., "E-Surat Letters")
2. User notes the folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Copy the `FOLDER_ID` part
3. User adds the folder ID to their profile in the application

#### Google Sheets Setup

1. User creates a Google Sheet with the following headers in row 1:

**For Incoming Letters (Surat Masuk):**
- A: `nomor_surat`
- B: `nama_pengirim`
- C: `nama_surat`
- D: `tanggal_masuk`
- E: `tanggal_buat`
- F: `google_drive_id`
- G: `file_path`
- H: `created_at`

**For Outgoing Letters (Surat Keluar):**
- A: `nomor_surat`
- B: `nama_penerima`
- C: `nama_surat`
- D: `tanggal_keluar`
- E: `tanggal_buat`
- F: `google_drive_id`
- G: `file_path`
- H: `created_at`

2. User copies the sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part
3. User adds the sheet ID to their profile in the application

### Step 8: Restart Backend Server

```bash
cd backend
npm run dev
```

## Important Notes

### Security
- **Never commit** `.env` file to version control
- **Never share** OAuth client secrets
- **Use HTTPS** in production for OAuth callbacks
- **Store tokens securely** in the database (encrypted in production)

### Token Management
- Access tokens expire after 1 hour
- Refresh tokens are used to obtain new access tokens automatically
- If a user's refresh token is revoked, they must reconnect their Google account
- The system handles token refresh automatically

### Storage
- Files are uploaded to each user's personal Google Drive
- Each user uses their own 15GB Google Drive storage quota
- Data is stored in each user's personal Google Sheets

### Scopes
The application requests the following OAuth scopes:
- `https://www.googleapis.com/auth/userinfo.profile` - Read user profile
- `https://www.googleapis.com/auth/userinfo.email` - Read user email
- `https://www.googleapis.com/auth/drive` - Full Google Drive access
- `https://www.googleapis.com/auth/spreadsheets` - Full Google Sheets access

## Troubleshooting

### OAuth consent screen error
**Solution**: Ensure you've configured the OAuth consent screen before creating OAuth credentials

### Redirect URI mismatch error
**Solution**: Verify the redirect URI in Google Cloud Console matches exactly with `GOOGLE_REDIRECT_URI` in `.env`

### "Access blocked" error during OAuth flow
**Solution**: Add the user as a test user in the OAuth consent screen (for development) or publish the app (for production)

### Token refresh fails
**Solution**: User needs to reconnect their Google account through the profile page

### File upload fails
**Solution**:
- Verify the user has connected their Google account
- Check that the user has provided valid folder and sheet IDs
- Ensure the user has granted the required permissions

### Permission denied for Drive/Sheets
**Solution**: The user must have granted the required scopes during OAuth authorization. If not, they need to reconnect their account.

## Production Deployment

For production deployment:

1. **Publish the OAuth app**: Complete Google's verification process for sensitive scopes
2. **Use HTTPS**: All OAuth callbacks must use HTTPS
3. **Update redirect URIs**: Add production domain to authorized redirect URIs
4. **Enable token encryption**: Encrypt OAuth tokens in the database
5. **Monitor API usage**: Monitor Google API quota and usage
6. **Set up alerts**: Configure alerts for OAuth failures and API errors

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
