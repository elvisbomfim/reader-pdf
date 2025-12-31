// Local PDF storage using IndexedDB

export interface LocalPDF {
    id: string;
    name: string;
    blob: Blob;
    size: number;
    uploadedAt: Date;
    syncedToDrive: boolean;
    driveId?: string;
}

const DB_NAME = 'LocalPDFStorage';
const DB_VERSION = 1;
const STORE_NAME = 'localPDFs';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveLocalPDF = async (file: File): Promise<LocalPDF> => {
    const db = await openDB();

    const localPDF: LocalPDF = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        blob: file,
        size: file.size,
        uploadedAt: new Date(),
        syncedToDrive: false,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(localPDF);

        request.onsuccess = () => resolve(localPDF);
        request.onerror = () => reject(request.error);
    });
};

export const listLocalPDFs = async (): Promise<LocalPDF[]> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const getLocalPDF = async (id: string): Promise<LocalPDF | null> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const deleteLocalPDF = async (id: string): Promise<void> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const markAsSynced = async (id: string, driveId: string): Promise<void> => {
    const db = await openDB();
    const localPDF = await getLocalPDF(id);

    if (!localPDF) {
        throw new Error('Local PDF not found');
    }

    localPDF.syncedToDrive = true;
    localPDF.driveId = driveId;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(localPDF);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const convertLocalPDFToPDF = (localPDF: LocalPDF): any => {
    return {
        id: localPDF.id,
        name: localPDF.name,
        driveId: localPDF.driveId || localPDF.id,
        size: localPDF.size,
        modifiedTime: localPDF.uploadedAt.toISOString(),
        isLocal: true,
        syncedToDrive: localPDF.syncedToDrive,
    };
};
