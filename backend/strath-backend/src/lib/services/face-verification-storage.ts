import { randomUUID } from "crypto";

import { GetObjectCommand, type GetObjectCommandOutput, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2 } from "@/lib/r2";

const DEFAULT_PREFIX = "face-verification";
const SIGNED_URL_EXPIRY_SECONDS = 600;

type UploadSlot = "front" | "left" | "right" | "smile" | "extra";
const REKOGNITION_SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

export function getFaceVerificationPrefix() {
    return (process.env.FACE_VERIFICATION_R2_PREFIX?.trim() || DEFAULT_PREFIX).replace(/^\/+|\/+$/g, "");
}

export function buildFaceVerificationSelfieKey(userId: string, sessionId: string, slot: UploadSlot, contentType: string) {
    const extension = getExtensionForContentType(contentType);
    return `${getFaceVerificationPrefix()}/${userId}/${sessionId}/selfies/${slot}-${Date.now()}-${randomUUID()}.${extension}`;
}

export function extractR2ObjectKeyFromUrl(assetUrl: string) {
    const trimmed = assetUrl.trim();
    if (!trimmed) {
        return null;
    }

    const baseUrl = R2_PUBLIC_URL.startsWith("http") ? R2_PUBLIC_URL : `https://${R2_PUBLIC_URL}`;
    if (!trimmed.startsWith(baseUrl)) {
        return null;
    }

    const key = trimmed.slice(baseUrl.length).replace(/^\/+/, "");
    return key || null;
}

export function isRekognitionSupportedImageKey(key: string) {
    const extension = key.split(".").pop()?.trim().toLowerCase();
    return !!extension && REKOGNITION_SUPPORTED_EXTENSIONS.has(extension);
}

export function getRekognitionUnsupportedImageKeys(keys: string[]) {
    return keys.filter((key) => !isRekognitionSupportedImageKey(key));
}

export async function createFaceVerificationUploadTarget(key: string, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });

    return {
        key,
        contentType,
        signedUrl,
        expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
    };
}

export async function getFaceVerificationObjectBytes(key: string) {
    const response = await r2.send(
        new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }),
    );

    return transformBodyToUint8Array(response);
}

function getExtensionForContentType(contentType: string) {
    switch (contentType) {
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/heic":
            return "heic";
        case "image/heif":
            return "heif";
        case "image/jpeg":
        default:
            return "jpg";
    }
}

async function transformBodyToUint8Array(response: GetObjectCommandOutput) {
    const body = response.Body;
    if (!body) {
        throw new Error("Verification asset body is empty.");
    }

    if ("transformToByteArray" in body && typeof body.transformToByteArray === "function") {
        return body.transformToByteArray();
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
        if (typeof chunk === "string") {
            chunks.push(Buffer.from(chunk));
        } else if (chunk instanceof Uint8Array) {
            chunks.push(chunk);
        } else {
            chunks.push(new Uint8Array(chunk));
        }
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}
