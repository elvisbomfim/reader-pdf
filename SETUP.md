# Setup Instructions

## 1. Install Dependencies

First, you need to install npm (if the sudo command is still waiting for password):

```bash
sudo apt install npm -y
```

Then install the project dependencies:

```bash
cd /home/elvis/projetos/create-reader-pdf
npm install
```

## 2. Configure Google Drive API

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: "PDF Sheet Music Reader"
   - User support email: your email
   - Developer contact: your email
   - Save and continue through the scopes and test users
4. Create OAuth client ID:
   - Application type: Web application
   - Name: "PDF Sheet Music Reader"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - Add your production URL later
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - Add your production URL later
5. Copy the Client ID

### Add Client ID to Environment

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Client ID:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id_here
```

## 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Test on Tablet

### Option 1: Local Network Access

1. Find your computer's IP address:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

2. Run the dev server with host binding:
```bash
npm run dev -- -H 0.0.0.0
```

3. On your tablet, open: `http://YOUR_IP:3000`

4. Update Google OAuth authorized origins to include: `http://YOUR_IP:3000`

### Option 2: Install as PWA

1. Open the app in Chrome/Edge on your tablet
2. Look for "Install" or "Add to Home Screen" option
3. Install the app
4. Use it like a native app!

## 5. Build for Production

```bash
npm run build
npm run start
```

## Troubleshooting

### PDF.js Worker Error

If you see errors about PDF.js worker, make sure the CDN link is accessible. You can also download the worker locally:

```bash
npm install pdfjs-dist
```

Then update the worker path in `components/PDFViewer.tsx`.

### Google Sign-In Not Working

- Make sure your Client ID is correct in `.env.local`
- Check that authorized origins include your current URL
- Clear browser cache and cookies
- Check browser console for errors

### PDFs Not Loading

- Make sure you're signed in to Google Drive
- Check that the PDFs are not restricted
- Verify internet connection
- Check browser console for errors
