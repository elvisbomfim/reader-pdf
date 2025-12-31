'use client';

import { Music, Library, FolderOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadSetlists } from '@/lib/storage';
import type { Setlist } from '@/lib/types';

export default function Home() {
    const [setlists, setSetlists] = useState<Setlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const lists = loadSetlists();
        setSetlists(lists);
        setIsLoading(false);
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Music className="h-8 w-8 text-primary-400" />
                            <h1 className="text-2xl font-bold text-white">Sheet Music Reader</h1>
                        </div>
                        <Link href="/settings" className="btn btn-ghost text-white">
                            <Settings className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link href="/drive" className="card hover:border-primary-500 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                                <FolderOpen className="h-8 w-8 text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Google Drive</h3>
                                <p className="text-sm text-slate-400">Browse and select PDFs from your Drive</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/setlists" className="card hover:border-primary-500 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                                <Library className="h-8 w-8 text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">My Setlists</h3>
                                <p className="text-sm text-slate-400">Create and manage your setlists</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Setlists */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Setlists</h2>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner"></div>
                        </div>
                    ) : setlists.length === 0 ? (
                        <div className="card text-center py-12">
                            <Library className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No setlists yet</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Create your first setlist to organize your sheet music
                            </p>
                            <Link href="/setlists" className="btn btn-primary inline-flex">
                                Create Setlist
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {setlists.slice(0, 6).map((setlist) => (
                                <Link
                                    key={setlist.id}
                                    href={`/setlists/${setlist.id}`}
                                    className="card hover:border-primary-500 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-white">{setlist.name}</h3>
                                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                            {setlist.pdfs.length} PDFs
                                        </span>
                                    </div>
                                    {setlist.description && (
                                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                                            {setlist.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        Updated {new Date(setlist.updatedAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Getting Started */}
                <div className="card bg-gradient-to-br from-primary-900/20 to-primary-800/10 border-primary-500/30">
                    <h2 className="text-xl font-bold text-white mb-4">Getting Started</h2>
                    <ol className="space-y-3 text-slate-300">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                1
                            </span>
                            <span>Connect your Google Drive account to access your PDF files</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                2
                            </span>
                            <span>Create a setlist and add your sheet music PDFs in order</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                3
                            </span>
                            <span>Open the setlist and navigate through your music with swipe gestures</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                4
                            </span>
                            <span>Add annotations and notes directly on your sheet music</span>
                        </li>
                    </ol>
                </div>
            </div>
        </main>
    );
}
