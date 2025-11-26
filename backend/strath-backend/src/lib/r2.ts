import { S3Client } from "@aws-sdk/client-s3";

const getEnv = (key: string) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
};

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: getEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
});

export const R2_BUCKET_NAME = getEnv("CLOUDFLARE_R2_BUCKET_NAME");
export const R2_PUBLIC_URL = getEnv("CLOUDFLARE_R2_PUBLIC_URL");
