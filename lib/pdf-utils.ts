// PDF manipulation utilities

import { PDFDocument } from 'pdf-lib';

export const loadPDFFromBlob = async (blob: Blob): Promise<PDFDocument> => {
    const arrayBuffer = await blob.arrayBuffer();
    return await PDFDocument.load(arrayBuffer);
};

export const loadPDFFromURL = async (url: string): Promise<PDFDocument> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await PDFDocument.load(arrayBuffer);
};

export const getPDFPageCount = async (pdfDoc: PDFDocument): Promise<number> => {
    return pdfDoc.getPageCount();
};

export const createPDFBlob = async (pdfDoc: PDFDocument): Promise<Blob> => {
    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

export const mergePDFs = async (pdfBlobs: Blob[]): Promise<Blob> => {
    if (pdfBlobs.length === 0) {
        throw new Error('No PDFs to merge');
    }

    if (pdfBlobs.length === 1) {
        return pdfBlobs[0];
    }

    const mergedPdf = await PDFDocument.create();

    for (const blob of pdfBlobs) {
        const pdfDoc = await loadPDFFromBlob(blob);
        const pageCount = pdfDoc.getPageCount();
        const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
        const pages = await mergedPdf.copyPages(pdfDoc, pageIndices);
        pages.forEach(page => mergedPdf.addPage(page));
    }

    return createPDFBlob(mergedPdf);
};

export const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// Cache PDF in IndexedDB for offline access
export const cachePDFInIndexedDB = async (
    pdfId: string,
    blob: Blob
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PDFCache', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');

            store.put({ id: pdfId, blob, timestamp: Date.now() });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }
        };
    });
};

export const getCachedPDFFromIndexedDB = async (
    pdfId: string
): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PDFCache', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            const getRequest = store.get(pdfId);

            getRequest.onsuccess = () => {
                const result = getRequest.result;
                resolve(result ? result.blob : null);
            };

            getRequest.onerror = () => reject(getRequest.error);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }
        };
    });
};

export const clearPDFCache = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PDFCache', 1);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');

            store.clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
    });
};

export const isPDFCached = async (pdfId: string): Promise<boolean> => {
    const blob = await getCachedPDFFromIndexedDB(pdfId);
    return blob !== null;
};

export const getCacheStatus = async (pdfIds: string[]): Promise<Map<string, boolean>> => {
    const statusMap = new Map<string, boolean>();

    await Promise.all(
        pdfIds.map(async (id) => {
            const cached = await isPDFCached(id);
            statusMap.set(id, cached);
        })
    );

    return statusMap;
};
