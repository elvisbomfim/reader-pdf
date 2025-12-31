'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Maximize,
    Minimize,
    Edit3,
    Download
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
    fileUrl: string;
    fileName?: string;
    onPageChange?: (page: number) => void;
    initialPage?: number;
    showAnnotations?: boolean;
    onNextPDF?: () => void;
    onPreviousPDF?: () => void;
    hasNextPDF?: boolean;
    hasPreviousPDF?: boolean;
}

export default function PDFViewer({
    fileUrl,
    fileName = 'Document',
    onPageChange,
    initialPage = 1,
    showAnnotations = false,
    onNextPDF,
    onPreviousPDF,
    hasNextPDF = false,
    hasPreviousPDF = false,
}: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(initialPage);
    const [scale, setScale] = useState<number>(1.0);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setPageNumber(initialPage);
    }, [initialPage]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
        setError(null);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('Error loading PDF:', error);
        setError('Failed to load PDF. Please try again.');
        setIsLoading(false);
    };

    const changePage = useCallback((offset: number) => {
        setPageNumber((prevPageNumber) => {
            const newPage = prevPageNumber + offset;
            if (newPage >= 1 && newPage <= numPages) {
                onPageChange?.(newPage);
                return newPage;
            }
            // If we're at the last page and trying to go forward, go to next PDF
            if (newPage > numPages && hasNextPDF && onNextPDF) {
                onNextPDF();
                return prevPageNumber;
            }
            // If we're at the first page and trying to go back, go to previous PDF
            if (newPage < 1 && hasPreviousPDF && onPreviousPDF) {
                onPreviousPDF();
                return prevPageNumber;
            }
            return prevPageNumber;
        });
    }, [numPages, onPageChange, hasNextPDF, hasPreviousPDF, onNextPDF, onPreviousPDF]);

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') previousPage();
            if (e.key === 'ArrowRight') nextPage();
            if (e.key === '+' || e.key === '=') zoomIn();
            if (e.key === '-') zoomOut();
            if (e.key === 'f') toggleFullscreen();
            // Ctrl/Cmd + Arrow keys for PDF navigation
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft' && hasPreviousPDF && onPreviousPDF) {
                e.preventDefault();
                onPreviousPDF();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight' && hasNextPDF && onNextPDF) {
                e.preventDefault();
                onNextPDF();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [numPages, hasNextPDF, hasPreviousPDF, onNextPDF, onPreviousPDF]);

    // Touch gestures for swipe navigation
    useEffect(() => {
        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        };

        const handleSwipe = () => {
            const swipeThreshold = 50;
            const swipeDistance = touchStartX - touchEndX;

            // Swipe left (next)
            if (swipeDistance > swipeThreshold) {
                // If we're on the last page and there's a next PDF, go to it
                if (pageNumber === numPages && hasNextPDF && onNextPDF) {
                    onNextPDF();
                } else {
                    nextPage();
                }
            }

            // Swipe right (previous)
            if (-swipeDistance > swipeThreshold) {
                // If we're on the first page and there's a previous PDF, go to it
                if (pageNumber === 1 && hasPreviousPDF && onPreviousPDF) {
                    onPreviousPDF();
                } else {
                    previousPage();
                }
            }
        };

        const viewer = document.getElementById('pdf-viewer-container');
        if (viewer) {
            viewer.addEventListener('touchstart', handleTouchStart);
            viewer.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if (viewer) {
                viewer.removeEventListener('touchstart', handleTouchStart);
                viewer.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [numPages, pageNumber, hasNextPDF, hasPreviousPDF, onNextPDF, onPreviousPDF]);

    return (
        <div className={`pdf-viewer-container ${isFullscreen ? 'fullscreen' : ''} bg-slate-900`}>
            {/* Toolbar */}
            <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-4 py-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-semibold truncate max-w-xs">{fileName}</h2>
                        {numPages > 0 && (
                            <span className="text-sm text-slate-400">
                                ({numPages} {numPages === 1 ? 'page' : 'pages'})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={zoomOut}
                                className="btn btn-ghost text-white p-2"
                                disabled={scale <= 0.5}
                                title="Zoom out (-)">
                                <ZoomOut className="h-5 w-5" />
                            </button>
                            <span className="text-white text-sm px-2 min-w-[4rem] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={zoomIn}
                                className="btn btn-ghost text-white p-2"
                                disabled={scale >= 3.0}
                                title="Zoom in (+)">
                                <ZoomIn className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Page navigation */}
                        <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={previousPage}
                                disabled={pageNumber <= 1}
                                className="btn btn-ghost text-white p-2"
                                title="Previous page (←)">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-white text-sm px-2 min-w-[5rem] text-center">
                                {pageNumber} / {numPages || '?'}
                            </span>
                            <button
                                onClick={nextPage}
                                disabled={pageNumber >= numPages}
                                className="btn btn-ghost text-white p-2"
                                title="Next page (→)">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Additional controls */}
                        <button
                            onClick={toggleFullscreen}
                            className="btn btn-ghost text-white p-2"
                            title="Fullscreen (F)">
                            {isFullscreen ? (
                                <Minimize className="h-5 w-5" />
                            ) : (
                                <Maximize className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* PDF Document */}
            <div
                id="pdf-viewer-container"
                className="flex items-center justify-center p-4 overflow-auto"
                style={{ height: 'calc(100vh - 80px)' }}>
                {isLoading && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="spinner"></div>
                        <p className="text-slate-400">Loading PDF...</p>
                    </div>
                )}

                {error && (
                    <div className="card bg-red-900/20 border-red-500/50 text-center max-w-md">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-primary">
                            Retry
                        </button>
                    </div>
                )}

                {!error && (
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                        className="fade-in">
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="shadow-2xl"
                        />
                    </Document>
                )}

                {/* Floating PDF Navigation Buttons (visible in fullscreen) */}
                {isFullscreen && (
                    <>
                        {/* Previous PDF Button */}
                        {hasPreviousPDF && onPreviousPDF && (
                            <button
                                onClick={onPreviousPDF}
                                className="fixed left-4 top-1/2 -translate-y-1/2 bg-slate-800/90 hover:bg-slate-700 text-white p-4 rounded-full shadow-2xl transition-all z-50 backdrop-blur-sm border border-slate-600"
                                title="Previous PDF (Ctrl+←)">
                                <ChevronLeft className="h-8 w-8" />
                            </button>
                        )}

                        {/* Next PDF Button */}
                        {hasNextPDF && onNextPDF && (
                            <button
                                onClick={onNextPDF}
                                className="fixed right-4 top-1/2 -translate-y-1/2 bg-slate-800/90 hover:bg-slate-700 text-white p-4 rounded-full shadow-2xl transition-all z-50 backdrop-blur-sm border border-slate-600"
                                title="Next PDF (Ctrl+→)">
                                <ChevronRight className="h-8 w-8" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
