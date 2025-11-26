import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export const useImageUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (uri: string) => {
        setIsUploading(true);
        setError(null);
        try {
            // 1. Get presigned URL
            const filename = uri.split('/').pop() || 'image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            // Get session token for authorization
            const session = await authClient.getSession();
            const token = session.data?.session?.token;

            const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

            console.log("[useImageUpload] Token:", token ? "Present" : "Missing");
            console.log("[useImageUpload] API URL:", apiUrl);

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

            // 2. Upload to R2
            const response = await fetch(uri);
            const blob = await response.blob();

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': type,
                },
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image to storage');

            return publicUrl;
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadImage, isUploading, error };
};
