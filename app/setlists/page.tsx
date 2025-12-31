'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Play, Download, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadSetlists, deleteSetlist, generateId } from '@/lib/storage';
import { getCacheStatus, cachePDFInIndexedDB } from '@/lib/pdf-utils';
import { downloadPDFFile } from '@/lib/google-drive';
import type { Setlist } from '@/lib/types';

export default function SetlistsPage() {
    const router = useRouter();
    const [setlists, setSetlists] = useState<Setlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cacheStatus, setCacheStatus] = useState<Map<string, Map<string, boolean>>>(new Map());
    const [downloadingSetlist, setDownloadingSetlist] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    useEffect(() => {
        const lists = loadSetlists();
        setSetlists(lists);
        setIsLoading(false);
        checkCacheStatus(lists);
    }, []);

    const checkCacheStatus = async (lists: Setlist[]) => {
        const statusMap = new Map<string, Map<string, boolean>>();

        for (const setlist of lists) {
            const pdfIds = setlist.pdfs.map(pdf => pdf.id);
            const status = await getCacheStatus(pdfIds);
            statusMap.set(setlist.id, status);
        }

        setCacheStatus(statusMap);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this setlist?')) {
            deleteSetlist(id);
            setSetlists(setlists.filter((s) => s.id !== id));
        }
    };

    const handleCreateNew = () => {
        const newId = generateId();
        router.push(`/setlists/${newId}?new=true`);
    };

    const handleMakeOffline = async (setlist: Setlist) => {
        setDownloadingSetlist(setlist.id);
        setDownloadProgress({ current: 0, total: setlist.pdfs.length });

        try {
            for (let i = 0; i < setlist.pdfs.length; i++) {
                const pdf = setlist.pdfs[i];

                // Skip local PDFs (already offline)
                if (pdf.isLocal) {
                    setDownloadProgress({ current: i + 1, total: setlist.pdfs.length });
                    continue;
                }

                // Check if already cached
                const status = cacheStatus.get(setlist.id);
                if (status?.get(pdf.id)) {
                    setDownloadProgress({ current: i + 1, total: setlist.pdfs.length });
                    continue;
                }

                // Download and cache
                const blob = await downloadPDFFile(pdf.driveId);
                await cachePDFInIndexedDB(pdf.id, blob);

                setDownloadProgress({ current: i + 1, total: setlist.pdfs.length });
            }

            // Update cache status
            await checkCacheStatus(setlists);
            alert('Setlist is now available offline!');
        } catch (error) {
            console.error('Error making setlist offline:', error);
            const errorMessage = error instanceof Error && error.message === 'Not authenticated'
                ? 'Please sign in to Google Drive first to download files.'
                : 'Failed to download some PDFs. Please try again.';
            alert(errorMessage);
        } finally {
            setDownloadingSetlist(null);
        }
    };

    const isSetlistFullyCached = (setlistId: string): boolean => {
        const status = cacheStatus.get(setlistId);
        if (!status) return false;

        const setlist = setlists.find(s => s.id === setlistId);
        if (!setlist) return false;

        return setlist.pdfs.every(pdf => status.get(pdf.id) === true);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="btn btn-ghost text-white">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-white">My Setlists</h1>
                        </div>
                        <button onClick={handleCreateNew} className="btn btn-primary">
                            <Plus className="h-5 w-5" />
                            New Setlist
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner"></div>
                    </div>
                ) : setlists.length === 0 ? (
                    <div className="card text-center py-12 max-w-md mx-auto">
                        <div className="mb-6">
                            <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus className="h-10 w-10 text-primary-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No setlists yet</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Create your first setlist to organize your sheet music in sequence
                            </p>
                        </div>
                        <button onClick={handleCreateNew} className="btn btn-primary inline-flex">
                            <Plus className="h-5 w-5" />
                            Create Your First Setlist
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {setlists.map((setlist) => {
                            const isFullyCached = isSetlistFullyCached(setlist.id);
                            const isDownloading = downloadingSetlist === setlist.id;

                            return (
                                <div key={setlist.id} className="card group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-lg">{setlist.name}</h3>
                                            {isFullyCached && (
                                                <div className="bg-green-500/20 border border-green-500/50 rounded-full p-1" title="Available offline">
                                                    <Check className="h-3 w-3 text-green-400" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                            {setlist.pdfs.length} PDFs
                                        </span>
                                    </div>

                                    {setlist.description && (
                                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                                            {setlist.description}
                                        </p>
                                    )}

                                    <div className="text-xs text-slate-500 mb-4">
                                        Updated {new Date(setlist.updatedAt).toLocaleDateString('pt-BR')}
                                    </div>

                                    {isDownloading && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                                <span>Downloading...</span>
                                                <span>{downloadProgress.current} / {downloadProgress.total}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-primary-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 flex-wrap">
                                        <Link
                                            href={`/setlists/${setlist.id}/play`}
                                            className="btn btn-primary flex-1">
                                            <Play className="h-4 w-4" />
                                            Play
                                        </Link>

                                        {setlist.pdfs.length > 0 && (
                                            <button
                                                onClick={() => handleMakeOffline(setlist)}
                                                disabled={isDownloading || isFullyCached}
                                                className={`btn ${isFullyCached ? 'btn-ghost text-green-400' : 'btn-secondary'}`}
                                                title={isFullyCached ? 'Already available offline' : 'Make available offline'}>
                                                {isDownloading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : isFullyCached ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}

                                        <Link
                                            href={`/setlists/${setlist.id}`}
                                            className="btn btn-secondary">
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(setlist.id)}
                                            className="btn btn-ghost text-red-400 hover:bg-red-900/20">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
