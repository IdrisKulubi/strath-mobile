import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface NormalizedImageAsset {
    uri: string;
    filename: string;
    contentType: string;
    wasConverted: boolean;
}

const JPEG_CONTENT_TYPE = 'image/jpeg';
const PNG_CONTENT_TYPE = 'image/png';

export async function normalizeImageForUpload(uri: string): Promise<NormalizedImageAsset> {
    const extension = getFileExtension(uri);

    if (extension === 'jpg' || extension === 'jpeg') {
        return {
            uri,
            filename: ensureFilenameExtension(getFilename(uri), 'jpg'),
            contentType: JPEG_CONTENT_TYPE,
            wasConverted: false,
        };
    }

    if (extension === 'png') {
        return {
            uri,
            filename: ensureFilenameExtension(getFilename(uri), 'png'),
            contentType: PNG_CONTENT_TYPE,
            wasConverted: false,
        };
    }

    const converted = await manipulateAsync(
        uri,
        [],
        {
            compress: 0.9,
            format: SaveFormat.JPEG,
        },
    );

    return {
        uri: converted.uri,
        filename: ensureFilenameExtension(getFilename(uri), 'jpg'),
        contentType: JPEG_CONTENT_TYPE,
        wasConverted: true,
    };
}

function getFilename(uri: string) {
    return uri.split('/').pop()?.split('?')[0] || `image-${Date.now()}`;
}

function getFileExtension(uri: string) {
    const filename = getFilename(uri).toLowerCase();
    const extension = filename.split('.').pop();
    return extension && extension !== filename ? extension : '';
}

function ensureFilenameExtension(filename: string, extension: string) {
    const baseName = filename.replace(/\.[^.]+$/, '');
    return `${baseName || `image-${Date.now()}`}.${extension}`;
}
