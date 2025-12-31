# PDF Sheet Music Reader

A Progressive Web App for viewing PDF sheet music in sequence, with Google Drive integration and annotation capabilities, optimized for tablet use.

## Features

- 📱 **Progressive Web App** - Install on any device
- 📁 **Google Drive Integration** - Access your PDFs from Drive
- 📚 **Setlist Management** - Organize PDFs in sequence
- 📖 **PDF Viewer** - Fullscreen, zoom, navigation
- 👆 **Touch Gestures** - Swipe to navigate
- ⌨️ **Keyboard Shortcuts** - Arrow keys, zoom controls
- 💾 **Offline Support** - Cache PDFs for offline use
- 🎨 **Dark Mode** - Easy on the eyes

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with Drive API enabled
- Google OAuth 2.0 credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - Your production URL
6. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - Your production URL
7. Copy the Client ID to your `.env.local`

## Usage

1. **Connect Google Drive** - Sign in with your Google account
2. **Create a Setlist** - Go to "My Setlists" and create a new setlist
3. **Add PDFs** - Browse your Drive and add PDFs to the setlist
4. **Play** - Open the setlist and navigate through your music

### Keyboard Shortcuts

- `←` / `→` - Previous/Next page
- `+` / `-` - Zoom in/out
- `F` - Toggle fullscreen

### Touch Gestures

- **Swipe left/right** - Navigate pages
- **Pinch** - Zoom in/out

## Building for Production

```bash
npm run build
npm run start
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **react-pdf** - PDF rendering
- **pdf-lib** - PDF manipulation
- **Google Drive API** - File access
- **next-pwa** - PWA support
- **IndexedDB** - Offline storage

## License

MIT
