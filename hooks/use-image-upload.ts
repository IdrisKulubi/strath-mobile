import { useState } from 'react';
import { getAuthToken } from '@/lib/auth-helpers';
import { normalizeImageForUpload } from '@/lib/image-normalization';

export const useImageUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [stage, setStage] = useState<'preparing' | 'uploading' | null>(null);

    const uploadImage = async (uri: string) => {
        setIsUploading(true);
        setError(null);
        setProgress(null);
        setStage('preparing');
        try {
            const normalizedImage = await normalizeImageForUpload(uri);

            // 1. Get presigned URL
            const filename = normalizedImage.filename;
            const type = normalizedImage.contentType;

            // Get session token for authorization
            const token = await getAuthToken();

            const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com";

            console.log("[useImageUpload] Token:", token ? "Present" : "Missing");
            console.log("[useImageUpload] API URL:", apiUrl);

            console.log("[useImageUpload] Step 1: Requesting presigned URL...");
            const presignRes = await fetch(`${apiUrl}/api/upload/presigned`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ filename, contentType: type }),
            });

            if (!presignRes.ok) {
                const errorData = await presignRes.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get upload URL');
            }

            const { signedUrl, publicUrl } = await presignRes.json();
            console.log("[useImageUpload] Step 2: Got presigned URL. Public URL:", publicUrl);

            // 2. Upload to R2
            console.log("[useImageUpload] Step 3: Reading local file blob...");
            const response = await fetch(normalizedImage.uri);
            const blob = await response.blob();
            console.log("[useImageUpload] Step 4: Uploading to R2...", signedUrl.substring(0, 50) + "...");

            setStage('uploading');
            await new Promise<void>((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.open('PUT', signedUrl);
                request.setRequestHeader('Content-Type', type);
                request.upload.onprogress = (event) => {
                    if (event.lengthComputable && event.total > 0) {
                        setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
                    }
                };
                request.onload = () => request.status >= 200 && request.status < 300
                    ? resolve()
                    : reject(new Error('Failed to upload image to storage'));
                request.onerror = () => reject(new Error('Upload interrupted. Please try again.'));
                request.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));
                request.timeout = 120000;
                request.send(blob);
            });

            return publicUrl;
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message);
            throw err;
        } finally {
            setIsUploading(false);
            setStage(null);
            setProgress(null);
        }
    };

    return { uploadImage, isUploading, error, progress, stage };
};
