'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Combine, Download, Cloud, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadSetlists, saveSetlist, generateId } from '@/lib/storage';
import { mergePDFs, mergePDFsWithSelection, type PageSelection } from '@/lib/pdf-utils';
import { downloadPDFFile, uploadPDFToDrive, isAuthenticated } from '@/lib/google-drive';
import { getCachedPDFFromIndexedDB } from '@/lib/pdf-utils';
import { getLocalPDF } from '@/lib/local-storage';
import DriveFileBrowser from '@/components/DriveFileBrowser';
import PageSelector from '@/components/PageSelector';
import dynamic from 'next/dynamic';
import { applyAnnotationsToPDF, type Annotation } from '@/lib/pdf-annotations';

const PDFEditor = dynamic(() => import('@/components/PDFEditor'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
});
import type { Setlist, PDF } from '@/lib/types';

export default function SetlistEditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isNew = searchParams.get('new') === 'true';

    const [setlist, setSetlist] = useState<Setlist>({
        id: params.id,
        name: '',
        description: '',
        pdfs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    const [showDriveBrowser, setShowDriveBrowser] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [showPageSelector, setShowPageSelector] = useState(false);
    const [showPDFEditor, setShowPDFEditor] = useState(false);
    const [currentEditingPdfIndex, setCurrentEditingPdfIndex] = useState(0);
    const [pdfAnnotations, setPdfAnnotations] = useState<Map<number, Annotation[]>>(new Map());
    const [isMerging, setIsMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState({ current: 0, total: 0 });
    const [pdfBlobs, setPdfBlobs] = useState<Blob[]>([]);

    useEffect(() => {
        if (!isNew) {
            const setlists = loadSetlists();
            const existing = setlists.find((s) => s.id === params.id);
            if (existing) {
                setSetlist(existing);
            } else {
                router.push('/setlists');
            }
        }
    }, [params.id, isNew, router]);

    const handleSave = () => {
        if (!setlist.name.trim()) {
            alert('Please enter a setlist name');
            return;
        }

        setIsSaving(true);
        const updatedSetlist = {
            ...setlist,
            updatedAt: new Date(),
        };
        saveSetlist(updatedSetlist);

        setTimeout(() => {
            setIsSaving(false);
            router.push('/setlists');
        }, 500);
    };

    const handleAddPDF = (pdf: PDF) => {
        if (!setlist.pdfs.some((p) => p.id === pdf.id)) {
            setSetlist({
                ...setlist,
                pdfs: [...setlist.pdfs, pdf],
            });
        }
    };

    const handleRemovePDF = (pdfId: string) => {
        setSetlist({
            ...setlist,
            pdfs: setlist.pdfs.filter((p) => p.id !== pdfId),
        });
    };

    const movePDF = (index: number, direction: 'up' | 'down') => {
        const newPdfs = [...setlist.pdfs];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newPdfs.length) {
            [newPdfs[index], newPdfs[newIndex]] = [newPdfs[newIndex], newPdfs[index]];
            setSetlist({ ...setlist, pdfs: newPdfs });
        }
    };

    const loadAllPDFs = async (): Promise<Blob[]> => {
        const blobs: Blob[] = [];

        for (let i = 0; i < setlist.pdfs.length; i++) {
            const pdf = setlist.pdfs[i];
            setMergeProgress({ current: i + 1, total: setlist.pdfs.length });

            let blob: Blob | null = null;

            // Try local storage first
            if (pdf.isLocal) {
                const localPDF = await getLocalPDF(pdf.id);
                if (localPDF) {
                    blob = localPDF.blob;
                }
            }

            // Try cache
            if (!blob) {
                blob = await getCachedPDFFromIndexedDB(pdf.id);
            }

            // Download from Drive
            if (!blob && !pdf.isLocal) {
                blob = await downloadPDFFile(pdf.driveId);
            }

            if (!blob) {
                throw new Error(`Failed to load PDF: ${pdf.name}`);
            }

            blobs.push(blob);
        }

        return blobs;
    };

    const handleSelectPages = async () => {
        setIsMerging(true);
        setMergeProgress({ current: 0, total: setlist.pdfs.length });

        try {
            const blobs = await loadAllPDFs();
            setPdfBlobs(blobs);
            setShowMergeModal(false);
            setShowPageSelector(true);
        } catch (error) {
            console.error('Error loading PDFs:', error);
            alert('Failed to load PDFs. Please try again.');
        } finally {
            setIsMerging(false);
            setMergeProgress({ current: 0, total: 0 });
        }
    };

    const handlePageSelectionConfirm = async (selections: PageSelection[], option: 'download' | 'upload') => {
        setIsMerging(true);
        setShowPageSelector(false);

        try {
            // Merge PDFs with selection
            const mergedBlob = await mergePDFsWithSelection(pdfBlobs, selections);
            const filename = `${setlist.name}.pdf`;

            if (option === 'download') {
                // Download merged PDF
                const url = URL.createObjectURL(mergedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('PDF merged and downloaded successfully!');
            } else {
                // Upload to Drive
                if (!isAuthenticated()) {
                    alert('Please sign in to Google Drive first');
                    return;
                }

                const file = new File([mergedBlob], filename, { type: 'application/pdf' });
                await uploadPDFToDrive(file);

                alert('PDF merged and uploaded to Google Drive successfully!');
            }
        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('Failed to merge PDFs. Please try again.');
        } finally {
            setIsMerging(false);
            setPdfBlobs([]);
        }
    };

    const handleEditAndMerge = async () => {
        setIsMerging(true);
        setMergeProgress({ current: 0, total: setlist.pdfs.length });

        try {
            const blobs = await loadAllPDFs();
            setPdfBlobs(blobs);
            setShowMergeModal(false);

            // Start editing first PDF
            setCurrentEditingPdfIndex(0);
            setShowPDFEditor(true);
        } catch (error) {
            console.error('Error loading PDFs:', error);
            alert('Failed to load PDFs. Please try again.');
            setIsMerging(false);
            setMergeProgress({ current: 0, total: 0 });
        }
    };

    const handleAnnotationSave = async (annotations: Annotation[]) => {
        // Store annotations for current PDF
        const newMap = new Map(pdfAnnotations);
        if (annotations.length > 0) {
            newMap.set(currentEditingPdfIndex, annotations);
        }
        setPdfAnnotations(newMap);

        // Move to next PDF or finish
        if (currentEditingPdfIndex < setlist.pdfs.length - 1) {
            setCurrentEditingPdfIndex(currentEditingPdfIndex + 1);
        } else {
            // Finished editing all PDFs, ask what to do
            setShowPDFEditor(false);

            const confirmed = confirm(
                'Finished editing all PDFs. Do you want to merge them now?\n\nOK for Download, Cancel for Upload to Drive.'
            );

            if (confirmed !== null) {
                await finishMergeWithAnnotations(confirmed ? 'download' : 'upload', newMap);
            } else {
                setPdfBlobs([]);
                setPdfAnnotations(new Map());
                setIsMerging(false);
            }
        }
    };

    const finishMergeWithAnnotations = async (option: 'download' | 'upload', annotationsMap: Map<number, Annotation[]>) => {
        setIsMerging(true);

        try {
            // Apply annotations to each PDF
            const annotatedBlobs: Blob[] = [];

            for (let i = 0; i < pdfBlobs.length; i++) {
                const annotations = annotationsMap.get(i);
                if (annotations && annotations.length > 0) {
                    setMergeProgress({ current: i + 1, total: pdfBlobs.length });
                    const annotatedBlob = await applyAnnotationsToPDF(pdfBlobs[i], annotations);
                    annotatedBlobs.push(annotatedBlob);
                } else {
                    annotatedBlobs.push(pdfBlobs[i]);
                }
            }

            // Merge annotated PDFs
            const mergedBlob = await mergePDFs(annotatedBlobs);
            const filename = `${setlist.name}.pdf`;

            if (option === 'download') {
                const url = URL.createObjectURL(mergedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('Annotated PDF merged and downloaded successfully!');
            } else {
                if (!isAuthenticated()) {
                    alert('Please sign in to Google Drive first');
                    return;
                }

                const file = new File([mergedBlob], filename, { type: 'application/pdf' });
                await uploadPDFToDrive(file);

                alert('Annotated PDF merged and uploaded to Google Drive successfully!');
            }
        } catch (error) {
            console.error('Error merging annotated PDFs:', error);
            alert('Failed to merge PDFs. Please try again.');
        } finally {
            setIsMerging(false);
            setPdfBlobs([]);
            setPdfAnnotations(new Map());
            setMergeProgress({ current: 0, total: 0 });
        }
    };

    const handleMergePDFs = async (option: 'download' | 'upload') => {
        setIsMerging(true);
        setMergeProgress({ current: 0, total: setlist.pdfs.length });

        try {
            // Download all PDFs
            const pdfBlobs: Blob[] = [];

            for (let i = 0; i < setlist.pdfs.length; i++) {
                const pdf = setlist.pdfs[i];
                setMergeProgress({ current: i + 1, total: setlist.pdfs.length });

                let blob: Blob | null = null;

                // Try local storage first
                if (pdf.isLocal) {
                    const localPDF = await getLocalPDF(pdf.id);
                    if (localPDF) {
                        blob = localPDF.blob;
                    }
                }

                // Try cache
                if (!blob) {
                    blob = await getCachedPDFFromIndexedDB(pdf.id);
                }

                // Download from Drive
                if (!blob && !pdf.isLocal) {
                    blob = await downloadPDFFile(pdf.driveId);
                }

                if (!blob) {
                    throw new Error(`Failed to load PDF: ${pdf.name}`);
                }

                pdfBlobs.push(blob);
            }

            // Merge PDFs
            const mergedBlob = await mergePDFs(pdfBlobs);
            const filename = `${setlist.name}.pdf`;

            if (option === 'download') {
                // Download merged PDF
                const url = URL.createObjectURL(mergedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('PDF merged and downloaded successfully!');
            } else {
                // Upload to Drive
                if (!isAuthenticated()) {
                    alert('Please sign in to Google Drive first');
                    return;
                }

                const file = new File([mergedBlob], filename, { type: 'application/pdf' });
                await uploadPDFToDrive(file);

                alert('PDF merged and uploaded to Google Drive successfully!');
            }

            setShowMergeModal(false);
        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('Failed to merge PDFs. Please try again.');
        } finally {
            setIsMerging(false);
            setMergeProgress({ current: 0, total: 0 });
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/setlists" className="btn btn-ghost text-white">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-white">
                                {isNew ? 'New Setlist' : 'Edit Setlist'}
                            </h1>
                        </div>
                        <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                            <Save className="h-5 w-5" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Setlist Details */}
                    <div className="space-y-6">
                        <div className="card">
                            <h2 className="text-lg font-bold text-white mb-4">Setlist Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={setlist.name}
                                        onChange={(e) => setSetlist({ ...setlist, name: e.target.value })}
                                        placeholder="e.g., Sunday Service, Concert Repertoire"
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={setlist.description}
                                        onChange={(e) => setSetlist({ ...setlist, description: e.target.value })}
                                        placeholder="Optional description..."
                                        rows={3}
                                        className="input w-full resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PDFs in Setlist */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white">
                                    PDFs ({setlist.pdfs.length})
                                </h2>
                                <div className="flex gap-2">
                                    {setlist.pdfs.length >= 2 && (
                                        <button
                                            onClick={() => setShowMergeModal(true)}
                                            className="btn btn-secondary btn-sm">
                                            <Combine className="h-4 w-4" />
                                            Merge PDFs
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowDriveBrowser(!showDriveBrowser)}
                                        className="btn btn-primary btn-sm">
                                        <Plus className="h-4 w-4" />
                                        Add PDF
                                    </button>
                                </div>
                            </div>

                            {setlist.pdfs.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="mb-2">No PDFs added yet</p>
                                    <p className="text-sm">Click "Add PDF" to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {setlist.pdfs.map((pdf, index) => (
                                        <div
                                            key={pdf.id}
                                            className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => movePDF(index, 'up')}
                                                    disabled={index === 0}
                                                    className="text-slate-400 hover:text-white disabled:opacity-30">
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => movePDF(index, 'down')}
                                                    disabled={index === setlist.pdfs.length - 1}
                                                    className="text-slate-400 hover:text-white disabled:opacity-30">
                                                    ▼
                                                </button>
                                            </div>
                                            <GripVertical className="h-5 w-5 text-slate-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{pdf.name}</p>
                                                <p className="text-xs text-slate-400">Position {index + 1}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemovePDF(pdf.id)}
                                                className="btn btn-ghost text-red-400 hover:bg-red-900/20 p-2">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drive Browser */}
                    <div className={showDriveBrowser ? 'block' : 'hidden lg:block'}>
                        <div className="card">
                            <h2 className="text-lg font-bold text-white mb-4">Add from Google Drive</h2>
                            <DriveFileBrowser
                                onSelectPDF={handleAddPDF}
                                multiSelect={false}
                                selectedPDFs={setlist.pdfs}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Merge Modal */}
            {showMergeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Merge PDFs</h2>
                            <button
                                onClick={() => setShowMergeModal(false)}
                                className="btn btn-ghost text-white p-2"
                                disabled={isMerging}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-slate-300 mb-2">
                                Combine {setlist.pdfs.length} PDFs into:
                            </p>
                            <p className="text-primary-400 font-semibold">
                                📄 {setlist.name}.pdf
                            </p>
                        </div>

                        {isMerging ? (
                            <div className="mb-6">
                                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                                    <span>Loading PDFs...</span>
                                    <span>{mergeProgress.current} / {mergeProgress.total}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-primary-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${(mergeProgress.current / mergeProgress.total) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-4">Choose merge option:</p>

                                <button
                                    onClick={() => {
                                        setShowMergeModal(false);
                                        handleMergePDFs('download');
                                    }}
                                    className="btn btn-primary w-full text-left justify-start">
                                    <div>
                                        <div className="font-semibold">⚡ Quick Merge</div>
                                        <div className="text-xs opacity-75">Merge all pages as-is</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleSelectPages}
                                    className="btn btn-secondary w-full text-left justify-start">
                                    <div>
                                        <div className="font-semibold">☑️ Select Pages</div>
                                        <div className="text-xs opacity-75">Choose specific pages to include</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleEditAndMerge}
                                    className="btn btn-secondary w-full text-left justify-start">
                                    <div>
                                        <div className="font-semibold">✏️ Edit & Merge</div>
                                        <div className="text-xs opacity-75">Annotate, crop, and customize</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Page Selector */}
            {showPageSelector && (
                <PageSelector
                    pdfs={setlist.pdfs}
                    pdfBlobs={pdfBlobs}
                    onConfirm={(selections) => {
                        // Show download/upload modal after selection
                        const confirmed = confirm(
                            `Merge ${selections.reduce((sum, s) => sum + s.pageNumbers.length, 0)} selected pages?\n\nChoose OK to download, or Cancel to upload to Drive.`
                        );
                        if (confirmed !== null) {
                            handlePageSelectionConfirm(selections, confirmed ? 'download' : 'upload');
                        }
                    }}
                    onCancel={() => {
                        setShowPageSelector(false);
                        setPdfBlobs([]);
                    }}
                />
            )}

            {/* PDF Editor */}
            {showPDFEditor && pdfBlobs[currentEditingPdfIndex] && (
                <PDFEditor
                    pdfBlob={pdfBlobs[currentEditingPdfIndex]}
                    pdfName={setlist.pdfs[currentEditingPdfIndex].name}
                    onSave={handleAnnotationSave}
                    onCancel={() => {
                        setShowPDFEditor(false);
                        setPdfBlobs([]);
                        setPdfAnnotations(new Map());
                    }}
                />
            )}
        </main>
    );
}
