# Node.js Version Issue with Google APIs

## Problem
You're using Node.js v24.13.0, which has OpenSSL 3.0 that's incompatible with the Google APIs library and the service account authentication. The error "error:1E08010C:DECODER routines::unsupported" indicates this incompatibility.

## Solution

You need to use Node.js v18 or v19 instead of v24. Here's how to fix it:

### Option 1: Use nvm (Node Version Manager) - Recommended

1. Install nvm if you don't have it:
   ```bash
   # For Windows with Git Bash or similar
   # Download from https://github.com/nvm-sh/nvm
   
   # Or use nvm-windows: https://github.com/coreybutler/nvm-windows
   ```

2. Install Node.js v18:
   ```bash
   nvm install 18
   nvm use 18
   ```

3. Verify the version:
   ```bash
   node --version
   # Should output: v18.x.x
   ```

4. Reinstall dependencies:
   ```bash
   cd C:\laragon\www\HIHIHI\backend
   rm -rf node_modules package-lock.json
   npm install
   ```

5. Test the connection:
   ```bash
   npm run test-google-connection
   ```

### Option 2: Use Laravel Herd's Node.js

If you have Laravel Herd installed (which you likely do since you're using Laragon):

1. Open Herd settings
2. Change the Node.js version to v18 LTS
3. Restart your terminal
4. Reinstall dependencies:
   ```bash
   cd C:\laragon\www\HIHIHI\backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Option 3: Install Node.js v18 Directly

1. Download Node.js v18 LTS from: https://nodejs.org/
2. Install it (this will replace your current Node.js)
3. Restart your terminal
4. Reinstall dependencies:
   ```bash
   cd C:\laragon\www\HIHIHI\backend
   rm -rf node_modules package-lock.json
   npm install
   ```

## Why This Is Happening

- Node.js v24 uses OpenSSL 3.0
- Google APIs library and service account authentication rely on older OpenSSL features
- The decryption routines in OpenSSL 3.0 don't support the algorithms used by the Google libraries
- This is a known compatibility issue

## Verification

After switching to Node.js v18:

1. Check your version:
   ```bash
   node --version
   ```

2. Test the Google connection:
   ```bash
   npm run test-google-connection
   ```

3. If successful, test the append functionality:
   ```bash
   npm run test-google-append
   ```

4. Start your application:
   ```bash
   npm run dev
   ```

## Temporary Workaround (Not Recommended)

If you absolutely must use Node.js v24, you can try setting this environment variable:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

However, this is not guaranteed to work and may cause other security issues.

## Updated package.json

I've added an engines field to package.json to specify the required Node.js version:

```json
"engines": {
  "node": ">=18.0.0 <20.0.0"
}
```

This will help prevent this issue in the future by ensuring compatible Node.js versions are used.