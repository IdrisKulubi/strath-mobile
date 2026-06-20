const defaults: Record<string, string> = {
    CLOUDFLARE_R2_ACCOUNT_ID: "test-account",
    CLOUDFLARE_R2_ACCESS_KEY_ID: "test-key",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: "test-secret",
    CLOUDFLARE_R2_BUCKET_NAME: "test-bucket",
    CLOUDFLARE_R2_PUBLIC_URL: "https://example.com",
};

for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value;
}
