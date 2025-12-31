import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'PDF Sheet Music Reader',
    description: 'Read and organize your sheet music PDFs in sequence',
    manifest: '/manifest.json',
    themeColor: '#0ea5e9',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 5,
        userScalable: true,
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Sheet Music Reader',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
                <script src="https://accounts.google.com/gsi/client" async defer></script>
            </head>
            <body className="dark">{children}</body>
        </html>
    )
}
