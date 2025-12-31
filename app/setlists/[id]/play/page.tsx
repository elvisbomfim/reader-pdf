'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, List } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadSetlists } from '@/lib/storage';
import { downloadPDFFile } from '@/lib/google-drive';
import { cachePDFInIndexedDB, getCachedPDFFromIndexedDB } from '@/lib/pdf-utils';
import PDFViewer from '@/components/PDFViewer';
import type { Setlist } from '@/lib/types';

export default function SetlistPlayPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [setlist, setSetlist] = useState<Setlist | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPlaylist, setShowPlaylist] = useState(false);

    useEffect(() => {
        const setlists = loadSetlists();
        const found = setlists.find((s) => s.id === params.id);

        if (!found || found.pdfs.length === 0) {
            router.push('/setlists');
            return;
        }

        setSetlist(found);
    }, [params.id, router]);

    useEffect(() => {
        if (setlist && setlist.pdfs[currentIndex]) {
            loadPDF(currentIndex);
        }
    }, [setlist, currentIndex]);

    const loadPDF = async (index: number) => {
        if (!setlist) return;

        const pdf = setlist.pdfs[index];
        setIsLoading(true);

        try {
            let blob: Blob | null = null;

            // Check if it's a local PDF
            if (pdf.isLocal) {
                // Import local storage dynamically
                const { getLocalPDF } = await import('@/lib/local-storage');
                const localPDF = await getLocalPDF(pdf.id);
                if (localPDF) {
                    blob = localPDF.blob;
                }
            }

            // If not local or not found, try cache
            if (!blob) {
                blob = await getCachedPDFFromIndexedDB(pdf.id);
            }

            // If still not found, download from Drive
            if (!blob && !pdf.isLocal) {
                blob = await downloadPDFFile(pdf.driveId);
                // Cache it
                await cachePDFInIndexedDB(pdf.id, blob);
            }

            if (!blob) {
                throw new Error('PDF not found');
            }

            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const goToNext = () => {
        if (setlist && currentIndex < setlist.pdfs.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const jumpTo = (index: number) => {
        setCurrentIndex(index);
        setShowPlaylist(false);
    };

    if (!setlist) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    const currentPDF = setlist.pdfs[currentIndex];

    return (
        <div className="h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm z-20">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/setlists" className="btn btn-ghost text-white p-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-white">{setlist.name}</h1>
                                <p className="text-xs text-slate-400">
                                    {currentIndex + 1} of {setlist.pdfs.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={goToPrevious}
                                disabled={currentIndex === 0}
                                className="btn btn-ghost text-white p-2"
                                title="Previous PDF">
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <button
                                onClick={() => setShowPlaylist(!showPlaylist)}
                                className="btn btn-ghost text-white p-2"
                                title="Show playlist">
                                <List className="h-5 w-5" />
                            </button>

                            <button
                                onClick={goToNext}
                                disabled={currentIndex === setlist.pdfs.length - 1}
                                className="btn btn-ghost text-white p-2"
                                title="Next PDF">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative">
                {/* PDF Viewer */}
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading {currentPDF.name}...</p>
                        </div>
                    </div>
                ) : pdfUrl ? (
                    <PDFViewer
                        fileUrl={pdfUrl}
                        fileName={currentPDF.name}
                        onPageChange={() => { }}
                        onNextPDF={goToNext}
                        onPreviousPDF={goToPrevious}
                        hasNextPDF={currentIndex < setlist.pdfs.length - 1}
                        hasPreviousPDF={currentIndex > 0}
                    />
                ) : null}

                {/* Playlist Sidebar */}
                {showPlaylist && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-30"
                            onClick={() => setShowPlaylist(false)}
                        />
                        <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 z-40 overflow-y-auto">
                            <div className="p-4">
                                <h2 className="text-lg font-bold text-white mb-4">Playlist</h2>
                                <div className="space-y-2">
                                    {setlist.pdfs.map((pdf, index) => (
                                        <button
                                            key={pdf.id}
                                            onClick={() => jumpTo(index)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${index === currentIndex
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}>
                                            <div className="flex items-start gap-2">
                                                <span className="text-sm font-bold">{index + 1}.</span>
                                                <span className="text-sm flex-1">{pdf.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
