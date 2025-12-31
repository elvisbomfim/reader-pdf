// LocalStorage utilities for persisting data

import { Setlist, Annotation, PDF } from './types';

const STORAGE_KEYS = {
    SETLISTS: 'pdf-reader-setlists',
    ANNOTATIONS: 'pdf-reader-annotations',
    CACHED_PDFS: 'pdf-reader-cached-pdfs',
    SETTINGS: 'pdf-reader-settings',
};

// Setlist operations
export const saveSetlists = (setlists: Setlist[]): void => {
    try {
        localStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
    } catch (error) {
        console.error('Error saving setlists:', error);
    }
};

export const loadSetlists = (): Setlist[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SETLISTS);
        if (!data) return [];

        const setlists = JSON.parse(data);
        // Convert date strings back to Date objects
        return setlists.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
        }));
    } catch (error) {
        console.error('Error loading setlists:', error);
        return [];
    }
};

export const saveSetlist = (setlist: Setlist): void => {
    const setlists = loadSetlists();
    const index = setlists.findIndex(s => s.id === setlist.id);

    if (index >= 0) {
        setlists[index] = setlist;
    } else {
        setlists.push(setlist);
    }

    saveSetlists(setlists);
};

export const deleteSetlist = (id: string): void => {
    const setlists = loadSetlists().filter(s => s.id !== id);
    saveSetlists(setlists);
};

// Annotation operations
export const saveAnnotations = (pdfId: string, annotations: Annotation[]): void => {
    try {
        const allAnnotations = loadAllAnnotations();
        allAnnotations[pdfId] = annotations;
        localStorage.setItem(STORAGE_KEYS.ANNOTATIONS, JSON.stringify(allAnnotations));
    } catch (error) {
        console.error('Error saving annotations:', error);
    }
};

export const loadAnnotations = (pdfId: string): Annotation[] => {
    try {
        const allAnnotations = loadAllAnnotations();
        const annotations = allAnnotations[pdfId] || [];

        // Convert date strings back to Date objects
        return annotations.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
        }));
    } catch (error) {
        console.error('Error loading annotations:', error);
        return [];
    }
};

const loadAllAnnotations = (): Record<string, Annotation[]> => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.ANNOTATIONS);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error loading all annotations:', error);
        return {};
    }
};

// PDF cache operations
export const cachePDF = (pdf: PDF): void => {
    try {
        const cached = loadCachedPDFs();
        const index = cached.findIndex(p => p.id === pdf.id);

        if (index >= 0) {
            cached[index] = pdf;
        } else {
            cached.push(pdf);
        }

        localStorage.setItem(STORAGE_KEYS.CACHED_PDFS, JSON.stringify(cached));
    } catch (error) {
        console.error('Error caching PDF:', error);
    }
};

export const loadCachedPDFs = (): PDF[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CACHED_PDFS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading cached PDFs:', error);
        return [];
    }
};

export const getCachedPDF = (id: string): PDF | null => {
    const cached = loadCachedPDFs();
    return cached.find(p => p.id === id) || null;
};

// Clear all data
export const clearAllData = (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
};

// Generate unique ID
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
