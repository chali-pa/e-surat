# E-Surat Frontend

React + Vite frontend for the E-Surat letter management system.

## Overview

The E-Surat frontend provides a modern, responsive user interface for managing incoming and outgoing letters (surat masuk and surat keluar). Users can create, edit, preview, and print letters while integrating with their personal Google Drive and Google Sheets for storage.

## Features

- **User Authentication**: Login and registration with JWT authentication
- **Google OAuth Integration**: Connect personal Google accounts for Drive and Sheets access
- **Letter Management**: Create, edit, delete incoming and outgoing letters
- **File Upload**: Upload PDF and document files for letters
- **Preview**: Preview letter documents in the browser
- **Print**: Print letters directly from the application
- **Google Drive Integration**: Store letter files in user's personal Google Drive
- **Google Sheets Integration**: Store letter metadata in user's personal Google Sheets
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Dark Mode**: Dark mode support

## Technology Stack

- **React 19**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client for API communication
- **Lucide React**: Icon library
- **XLSX**: Excel file handling
- **Mammoth**: Word document handling

## Prerequisites

- Node.js >= 18
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

## Development

Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Build

Build for production:
```bash
npm run build
```

The build output will be in the `dist/` directory.

## Linting

Run linter:
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── axios.ts           # Axios configuration
│   ├── components/
│   │   └── Layout.jsx         # Main layout component
│   ├── pages/
│   │   ├── Landing.jsx        # Landing page
│   │   ├── auth/
│   │   │   ├── Login.jsx      # Login page
│   │   │   ├── Register.jsx   # Registration page
│   │   │   └── GoogleCallback.jsx  # OAuth callback
│   │   ├── Dashboard.jsx      # Dashboard
│   │   ├── SuratMasuk.jsx     # Incoming letters
│   │   ├── SuratKeluar.jsx    # Outgoing letters
│   │   └── Profile.jsx        # User profile
│   └── App.jsx                # Main app component
├── public/                    # Static assets
├── index.html                 # HTML entry point
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind configuration
├── vite.config.js             # Vite configuration
└── vercel.json                # Vercel deployment config
```

## Environment Variables

- `VITE_API_BASE_URL`: Backend API URL (e.g., `http://localhost:3000`)
- `VITE_RECAPTCHA_SITE_KEY`: Google reCAPTCHA site key for form validation

## API Integration

The frontend communicates with the backend API using Axios. All API calls are configured in `src/api/axios.ts` with automatic JWT token handling.

### Authentication

- Login: `POST /api/login`
- Register: `POST /api/register`
- Logout: `POST /api/logout`

### Google OAuth

- Connect: `GET /api/google/connect`
- Callback: `GET /api/google/callback`
- Disconnect: `POST /api/google/disconnect`

### Letters

- Incoming letters: `/api/surat`
- Outgoing letters: `/api/surat-keluar`

## Deployment

### Vercel

The frontend is configured for Vercel deployment. Deploy with:

```bash
vercel
```

Set environment variables in Vercel Dashboard:
- `VITE_API_BASE_URL`: Your production backend URL
- `VITE_RECAPTCHA_SITE_KEY`: Production reCAPTCHA site key

## Security Notes

- Never commit `.env` files to version control
- Use HTTPS in production
- Validate all user inputs
- Keep dependencies updated
- Use environment variables for sensitive configuration

## Troubleshooting

### API connection errors
- Verify `VITE_API_BASE_URL` is correct
- Ensure backend server is running
- Check CORS configuration on backend

### Google OAuth errors
- Verify OAuth redirect URI matches in Google Cloud Console
- Ensure user is added as test user (development) or app is published (production)
- Check that OAuth credentials are configured in backend

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version (>= 18 required)

## Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)
