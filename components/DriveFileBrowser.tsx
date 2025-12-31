'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderOpen, FileText, Search, LogIn, LogOut, Loader2, Plus, Star, Folder, ChevronRight, Home, ArrowLeft, Upload, Cloud, HardDrive, Check } from 'lucide-react';
import {
    initializeGoogleDrive,
    requestAccessToken,
    listPDFsInFolder,
    listFolders,
    listStarredPDFs,
    searchPDFFiles,
    isAuthenticated,
    revokeAccess,
    convertDriveFileToPDF,
    uploadPDFToDrive,
} from '@/lib/google-drive';
import {
    saveLocalPDF,
    listLocalPDFs,
    deleteLocalPDF,
    markAsSynced,
    convertLocalPDFToPDF,
    type LocalPDF,
} from '@/lib/local-storage';
import type { GoogleDriveFile, PDF } from '@/lib/types';

interface DriveFileBrowserProps {
    onSelectPDF?: (pdf: PDF) => void;
    multiSelect?: boolean;
    selectedPDFs?: PDF[];
}

interface FolderPathItem {
    id: string | null;
    name: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function DriveFileBrowser({
    onSelectPDF,
    multiSelect = false,
    selectedPDFs = [],
}: DriveFileBrowserProps) {
    const [authenticated, setAuthenticated] = useState(false);
    const [files, setFiles] = useState<GoogleDriveFile[]>([]);
    const [localFiles, setLocalFiles] = useState<LocalPDF[]>([]);
    const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<PDF[]>(selectedPDFs);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<FolderPathItem[]>([{ id: null, name: 'Meu Drive' }]);
    const [showStarredOnly, setShowStarredOnly] = useState(false);
    const [activeTab, setActiveTab] = useState<'drive' | 'local'>('drive');
    const [uploading, setUploading] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Check browser compatibility
        if (typeof window !== 'undefined') {
            // Check for IndexedDB support
            if (!window.indexedDB) {
                setError('Your browser does not support offline storage. Please use a modern browser.');
            }
        }

        if (GOOGLE_CLIENT_ID) {
            initializeGoogleDrive(GOOGLE_CLIENT_ID);
            setAuthenticated(isAuthenticated());
        }
        loadLocalFiles();
    }, []);

    const loadLocalFiles = async () => {
        try {
            // Check IndexedDB support
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported');
                return;
            }
            const locals = await listLocalPDFs();
            setLocalFiles(locals);
        } catch (err) {
            console.error('Error loading local files:', err);
            setError('Failed to load local files. Your browser may not support this feature.');
        }
    };

    const handleSignIn = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if Google Identity Services is available
            // @ts-ignore - Google Identity Services is loaded dynamically
            if (typeof window !== 'undefined' && !window.google?.accounts) {
                setError('Google Sign-In is not supported on this browser. Please use Chrome, Safari, or Firefox on a newer device.');
                return;
            }

            await requestAccessToken();
            setAuthenticated(true);
            await loadFiles();
        } catch (err) {
            console.error('Sign in error:', err);
            setError('Failed to sign in. Please try using a newer browser or device.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        revokeAccess();
        setAuthenticated(false);
        setFiles([]);
        setFolders([]);
        setSelected([]);
        setCurrentFolderId(null);
        setFolderPath([{ id: null, name: 'Meu Drive' }]);
        setShowStarredOnly(false);
    };

    const loadFiles = async (folderId: string | null = currentFolderId) => {
        try {
            setLoading(true);
            setError(null);

            if (showStarredOnly) {
                const starredFiles = await listStarredPDFs();
                setFiles(starredFiles);
                setFolders([]);
            } else {
                const [pdfFiles, folderList] = await Promise.all([
                    listPDFsInFolder(folderId || undefined),
                    listFolders(folderId || undefined),
                ]);
                setFiles(pdfFiles);
                setFolders(folderList);
            }
        } catch (err) {
            console.error('Error loading files:', err);
            setError('Failed to load files from Google Drive.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadFiles();
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const results = await searchPDFFiles(searchQuery, currentFolderId || undefined);
            setFiles(results);
            setFolders([]);
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search files.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFile = (file: GoogleDriveFile | LocalPDF) => {
        const pdf = 'blob' in file ? convertLocalPDFToPDF(file) : convertDriveFileToPDF(file);

        if (multiSelect) {
            const isSelected = selected.some((p) => p.id === pdf.id);
            if (isSelected) {
                setSelected(selected.filter((p) => p.id !== pdf.id));
            } else {
                setSelected([...selected, pdf]);
            }
        } else {
            onSelectPDF?.(pdf);
        }
    };

    const handleFolderClick = (folder: GoogleDriveFile) => {
        setCurrentFolderId(folder.id);
        setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
        setSearchQuery('');
        loadFiles(folder.id);
    };

    const handleBreadcrumbClick = (index: number) => {
        const newPath = folderPath.slice(0, index + 1);
        const targetFolder = newPath[newPath.length - 1];
        setCurrentFolderId(targetFolder.id);
        setFolderPath(newPath);
        setSearchQuery('');
        loadFiles(targetFolder.id);
    };

    const handleBackClick = () => {
        if (folderPath.length > 1) {
            handleBreadcrumbClick(folderPath.length - 2);
        }
    };

    const toggleStarredFilter = () => {
        setShowStarredOnly(!showStarredOnly);
        setSearchQuery('');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }

        try {
            setUploading(true);
            await saveLocalPDF(file);
            await loadLocalFiles();
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleSyncToDrive = async (localPDF: LocalPDF) => {
        if (!authenticated) {
            alert('Please sign in to Google Drive first');
            return;
        }

        try {
            setSyncingId(localPDF.id);
            const file = new File([localPDF.blob], localPDF.name, { type: 'application/pdf' });
            const driveFile = await uploadPDFToDrive(file, currentFolderId || undefined);
            await markAsSynced(localPDF.id, driveFile.id);
            await loadLocalFiles();
            alert('File synced to Google Drive!');
        } catch (err) {
            console.error('Error syncing to Drive:', err);
            alert('Failed to sync to Google Drive');
        } finally {
            setSyncingId(null);
        }
    };

    const handleDeleteLocal = async (id: string) => {
        if (confirm('Delete this local file?')) {
            try {
                await deleteLocalPDF(id);
                await loadLocalFiles();
            } catch (err) {
                console.error('Error deleting file:', err);
                alert('Failed to delete file');
            }
        }
    };

    useEffect(() => {
        if (authenticated && activeTab === 'drive') {
            loadFiles();
        }
    }, [showStarredOnly, activeTab]);

    const isFileSelected = (fileId: string) => {
        return selected.some((p) => p.id === fileId);
    };

    const formatFileSize = (bytes?: number | string) => {
        const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
        if (!size) return 'Unknown size';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="card bg-yellow-900/20 border-yellow-500/50 text-center">
                <p className="text-yellow-400 mb-4">
                    Google Drive integration is not configured. Please add your Google Client ID to the environment variables.
                </p>
                <p className="text-sm text-slate-400">
                    Add <code className="bg-slate-800 px-2 py-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your .env.local file
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-bold text-white">PDF Files</h2>
                {authenticated && (
                    <button onClick={handleSignOut} className="btn btn-ghost text-white">
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('local')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'local'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-slate-400 hover:text-white'
                        }`}>
                    <HardDrive className="h-4 w-4 inline mr-2" />
                    Local Files
                </button>
                <button
                    onClick={() => setActiveTab('drive')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'drive'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-slate-400 hover:text-white'
                        }`}>
                    <Cloud className="h-4 w-4 inline mr-2" />
                    Google Drive
                </button>
            </div>

            {/* Local Files Tab */}
            {activeTab === 'local' && (
                <>
                    {/* Upload Button */}
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn btn-primary">
                            {uploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5" />
                                    Upload PDF
                                </>
                            )}
                        </button>
                    </div>

                    {/* Local Files List */}
                    {localFiles.length === 0 ? (
                        <div className="card text-center py-12">
                            <HardDrive className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No local files</h3>
                            <p className="text-sm text-slate-400">
                                Upload PDFs to use them offline
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {localFiles.map((file) => {
                                const isSelected = isFileSelected(file.id);
                                const isSyncing = syncingId === file.id;

                                return (
                                    <div
                                        key={file.id}
                                        className={`card transition-all ${isSelected
                                            ? 'border-primary-500 bg-primary-900/20'
                                            : 'hover:border-primary-500/50'
                                            }`}>
                                        <div className="flex items-start gap-3 mb-3">
                                            <FileText className={`h-8 w-8 flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-slate-400'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2">
                                                    <h3 className="font-semibold text-white truncate mb-1 flex-1">
                                                        {file.name}
                                                    </h3>
                                                    {file.syncedToDrive && (
                                                        <Cloud className="h-4 w-4 text-green-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    {formatFileSize(file.size)}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(file.uploadedAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSelectFile(file)}
                                                className="btn btn-primary flex-1 btn-sm">
                                                {isSelected ? 'Selected' : 'Select'}
                                            </button>

                                            {!file.syncedToDrive && authenticated && (
                                                <button
                                                    onClick={() => handleSyncToDrive(file)}
                                                    disabled={isSyncing}
                                                    className="btn btn-secondary btn-sm"
                                                    title="Sync to Google Drive">
                                                    {isSyncing ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Google Drive Tab */}
            {activeTab === 'drive' && (
                <>
                    {!authenticated ? (
                        <div className="card text-center max-w-md mx-auto">
                            <FolderOpen className="h-16 w-16 text-primary-400 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Connect to Google Drive</h2>
                            <p className="text-slate-400 mb-6">
                                Sign in with your Google account to access your PDF files from Google Drive
                            </p>
                            <button
                                onClick={handleSignIn}
                                disabled={loading}
                                className="btn btn-primary inline-flex">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="h-5 w-5" />
                                        Sign in with Google
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Breadcrumb Navigation */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {folderPath.length > 1 && (
                                    <button
                                        onClick={handleBackClick}
                                        className="btn btn-ghost text-white p-2"
                                        title="Voltar">
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {folderPath.map((item, index) => (
                                        <div key={item.id || 'root'} className="flex items-center gap-2">
                                            {index > 0 && <ChevronRight className="h-4 w-4 text-slate-500" />}
                                            <button
                                                onClick={() => handleBreadcrumbClick(index)}
                                                className={`text-sm ${index === folderPath.length - 1
                                                    ? 'text-white font-semibold'
                                                    : 'text-slate-400 hover:text-white'
                                                    }`}>
                                                {index === 0 ? <Home className="h-4 w-4" /> : item.name}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex gap-2 flex-wrap">
                                <div className="flex-1 relative min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search PDFs..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="input pl-10 w-full"
                                    />
                                </div>
                                <button onClick={handleSearch} className="btn btn-primary" disabled={loading}>
                                    Search
                                </button>
                                <button
                                    onClick={toggleStarredFilter}
                                    className={`btn ${showStarredOnly ? 'btn-primary' : 'btn-ghost text-white'}`}
                                    title="Starred files">
                                    <Star className={`h-5 w-5 ${showStarredOnly ? 'fill-current' : ''}`} />
                                    {showStarredOnly && 'Starred'}
                                </button>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="card bg-red-900/20 border-red-500/50">
                                    <p className="text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Selected count (multi-select mode) */}
                            {multiSelect && selected.length > 0 && (
                                <div className="card bg-primary-900/20 border-primary-500/50">
                                    <p className="text-primary-400">
                                        {selected.length} PDF{selected.length !== 1 ? 's' : ''} selected
                                    </p>
                                </div>
                            )}

                            {/* File list */}
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="spinner"></div>
                                </div>
                            ) : files.length === 0 && folders.length === 0 ? (
                                <div className="card text-center py-12">
                                    <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No PDFs found</h3>
                                    <p className="text-sm text-slate-400">
                                        {searchQuery
                                            ? 'Try a different search query'
                                            : showStarredOnly
                                                ? 'No starred PDFs found'
                                                : 'Upload some PDF files to your Google Drive'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Folders */}
                                    {folders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            onClick={() => handleFolderClick(folder)}
                                            className="card text-left transition-all hover:border-primary-500/50">
                                            <div className="flex items-start gap-3">
                                                <Folder className="h-8 w-8 flex-shrink-0 text-yellow-500" />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white truncate mb-1">
                                                        {folder.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400">Folder</p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-400" />
                                            </div>
                                        </button>
                                    ))}

                                    {/* PDF Files */}
                                    {files.map((file) => {
                                        const isSelected = isFileSelected(file.id);
                                        return (
                                            <button
                                                key={file.id}
                                                onClick={() => handleSelectFile(file)}
                                                className={`card text-left transition-all ${isSelected
                                                    ? 'border-primary-500 bg-primary-900/20'
                                                    : 'hover:border-primary-500/50'
                                                    }`}>
                                                <div className="flex items-start gap-3">
                                                    <FileText className={`h-8 w-8 flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-slate-400'
                                                        }`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start gap-2">
                                                            <h3 className="font-semibold text-white truncate mb-1 flex-1">
                                                                {file.name}
                                                            </h3>
                                                            {file.starred && (
                                                                <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                        {file.modifiedTime && (
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {isSelected && multiSelect && (
                                                        <div className="flex-shrink-0 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                                            <Plus className="h-4 w-4 text-white rotate-45" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
