// Google Drive API integration

import { GoogleDriveFile, PDF } from './types';

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

const TOKEN_STORAGE_KEY = 'google_drive_token';
const TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

export const initializeGoogleDrive = (clientId: string) => {
    // This will be initialized on the client side with Google Identity Services
    if (typeof window !== 'undefined') {
        // Try to restore token from localStorage
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (storedToken && storedExpiry) {
            const expiry = parseInt(storedExpiry);
            if (Date.now() < expiry) {
                accessToken = storedToken;
                tokenExpiry = expiry;
            } else {
                // Token expired, clear it
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                localStorage.removeItem(TOKEN_EXPIRY_KEY);
            }
        }

        // @ts-ignore
        tokenClient = window.google?.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '', // Will be set during getToken call
        });
    }
};

export const requestAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Drive not initialized'));
            return;
        }

        tokenClient.callback = (response: any) => {
            if (response.error) {
                reject(response);
                return;
            }
            accessToken = response.access_token;

            // Store token with 50 minutes expiry (tokens last 1 hour, refresh before)
            const expiry = Date.now() + (50 * 60 * 1000);
            tokenExpiry = expiry;

            if (typeof window !== 'undefined' && accessToken) {
                localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
                localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
            }

            resolve(response.access_token);
        };

        tokenClient.requestAccessToken();
    });
};

const ensureValidToken = async (): Promise<void> => {
    if (!accessToken || !tokenExpiry || Date.now() >= tokenExpiry) {
        // Token expired or missing, request new one
        await requestAccessToken();
    }
};

export const listPDFFiles = async (pageToken?: string): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
}> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
        q: "mimeType='application/pdf' and trashed=false",
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, size, modifiedTime, starred)',
        pageSize: '50',
        orderBy: 'modifiedTime desc',
    });

    if (pageToken) {
        params.append('pageToken', pageToken);
    }

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch files from Google Drive');
    }

    const data = await response.json();
    return {
        files: data.files || [],
        nextPageToken: data.nextPageToken,
    };
};

export const listFolders = async (folderId?: string): Promise<GoogleDriveFile[]> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const folderQuery = folderId
        ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : "mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents";

    const params = new URLSearchParams({
        q: folderQuery,
        fields: 'files(id, name, mimeType, modifiedTime)',
        pageSize: '100',
        orderBy: 'name',
    });

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch folders from Google Drive');
    }

    const data = await response.json();
    return data.files || [];
};

export const listPDFsInFolder = async (folderId?: string): Promise<GoogleDriveFile[]> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const pdfQuery = folderId
        ? `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`
        : "mimeType='application/pdf' and trashed=false and 'root' in parents";

    const params = new URLSearchParams({
        q: pdfQuery,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, size, modifiedTime, starred)',
        pageSize: '100',
        orderBy: 'name',
    });

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch PDFs from folder');
    }

    const data = await response.json();
    return data.files || [];
};

export const listStarredPDFs = async (): Promise<GoogleDriveFile[]> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
        q: "mimeType='application/pdf' and starred=true and trashed=false",
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, size, modifiedTime, starred)',
        pageSize: '100',
        orderBy: 'modifiedTime desc',
    });

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch starred PDFs');
    }

    const data = await response.json();
    return data.files || [];
};

export const searchPDFFiles = async (query: string, folderId?: string): Promise<GoogleDriveFile[]> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    let searchQuery = `mimeType='application/pdf' and trashed=false and name contains '${query}'`;
    if (folderId) {
        searchQuery += ` and '${folderId}' in parents`;
    }

    const params = new URLSearchParams({
        q: searchQuery,
        fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, size, modifiedTime, starred)',
        pageSize: '50',
    });

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to search files');
    }

    const data = await response.json();
    return data.files || [];
};

export const downloadPDFFile = async (fileId: string): Promise<Blob> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to download file');
    }

    return await response.blob();
};

export const getFileMetadata = async (fileId: string): Promise<GoogleDriveFile> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
        fields: 'id, name, mimeType, thumbnailLink, webContentLink, size, modifiedTime',
    });

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get file metadata');
    }

    return await response.json();
};

export const convertDriveFileToPDF = (file: GoogleDriveFile): PDF => {
    return {
        id: file.id,
        name: file.name,
        driveId: file.id,
        thumbnail: file.thumbnailLink,
        url: file.webContentLink,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : undefined,
        modifiedTime: file.modifiedTime,
    };
};

export const isAuthenticated = (): boolean => {
    return accessToken !== null;
};

export const revokeAccess = () => {
    if (accessToken && typeof window !== 'undefined') {
        // @ts-ignore
        window.google?.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
        });
    }
};

export const uploadPDFToDrive = async (
    file: File,
    folderId?: string
): Promise<GoogleDriveFile> => {
    await ensureValidToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    const metadata = {
        name: file.name,
        mimeType: 'application/pdf',
        ...(folderId && { parents: [folderId] }),
    };

    const form = new FormData();
    form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', file);

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webContentLink,size,modifiedTime,starred',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        }
    );

    if (!response.ok) {
        throw new Error('Failed to upload file to Google Drive');
    }

    return await response.json();
};
