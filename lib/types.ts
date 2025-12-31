// Core TypeScript types for the PDF Sheet Music Reader

export interface PDF {
    id: string;
    name: string;
    driveId: string;
    url?: string;
    thumbnail?: string;
    mimeType?: string;
    size?: number;
    modifiedTime?: string;
    isLocal?: boolean;
    syncedToDrive?: boolean;
}

export interface Setlist {
    id: string;
    name: string;
    description?: string;
    pdfs: PDF[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Annotation {
    id: string;
    pdfId: string;
    pageNumber: number;
    data: string; // fabric.js JSON serialized
    createdAt: Date;
    updatedAt: Date;
}

export interface AnnotationSet {
    pdfId: string;
    annotations: Map<number, Annotation>; // pageNumber -> Annotation
}

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webContentLink?: string;
    size?: string;
    modifiedTime?: string;
    starred?: boolean;
}

export interface ViewerState {
    currentPdfId: string | null;
    currentPage: number;
    totalPages: number;
    zoom: number;
    isFullscreen: boolean;
    showAnnotations: boolean;
}

export interface SetlistPlayerState {
    setlistId: string | null;
    currentPdfIndex: number;
    isPlaying: boolean;
}
