'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DriveFileBrowser from '@/components/DriveFileBrowser';
import type { PDF } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cachePDF } from '@/lib/storage';

export default function DrivePage() {
    const router = useRouter();
    const [selectedPDFs, setSelectedPDFs] = useState<PDF[]>([]);

    const handleSelectPDF = (pdf: PDF) => {
        // Cache the PDF metadata
        cachePDF(pdf);

        // Navigate to viewer
        router.push(`/viewer?pdfId=${pdf.id}&source=drive`);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="btn btn-ghost text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Google Drive</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <DriveFileBrowser onSelectPDF={handleSelectPDF} />
            </div>
        </main>
    );
}
