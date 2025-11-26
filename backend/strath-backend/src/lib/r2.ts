import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
