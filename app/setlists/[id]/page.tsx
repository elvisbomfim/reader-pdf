'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadSetlists, saveSetlist, generateId } from '@/lib/storage';
import DriveFileBrowser from '@/components/DriveFileBrowser';
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
                                <button
                                    onClick={() => setShowDriveBrowser(!showDriveBrowser)}
                                    className="btn btn-primary btn-sm">
                                    <Plus className="h-4 w-4" />
                                    Add PDF
                                </button>
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
        </main>
    );
}
