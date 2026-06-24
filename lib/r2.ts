/**
 * Cloudflare R2 storage client.
 * R2 is S3-compatible, so we use the AWS SDK with R2's endpoint.
 *
 * Setup:
 *   1. Sign up at https://dash.cloudflare.com (or sign in)
 *   2. Workers & Pages → R2 → Create bucket (suggest name: "bba-avatars")
 *   3. Bucket → Settings → "Public Development URL" → enable.
 *      Copy the URL Cloudflare gives you (looks like https://pub-XXXXXX.r2.dev)
 *   4. R2 → Manage R2 API Tokens → Create API token
 *      Permissions: "Object Read & Write" on that bucket
 *      Copy the Access Key ID and Secret Access Key
 *   5. Set these env vars on Vercel (Production + Preview):
 *      R2_ACCOUNT_ID = <your Cloudflare account id, find in R2 overview>
 *      R2_ACCESS_KEY_ID = <from step 4>
 *      R2_SECRET_ACCESS_KEY = <from step 4>
 *      R2_BUCKET_NAME = bba-avatars
 *      R2_PUBLIC_URL = https://pub-XXXXXX.r2.dev
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_URL;

let cachedClient: S3Client | null = null;

function getClient(): S3Client | null {
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return cachedClient;
}

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBaseUrl);
}

export type R2UploadResult =
  | { ok: true; url: string; key: string }
  | { ok: false; error: string };

export async function uploadAvatarToR2(file: File, userId: string): Promise<R2UploadResult> {
  const client = getClient();
  if (!client || !bucket || !publicBaseUrl) {
    return { ok: false, error: "R2 not configured" };
  }

  const ext = (file.type.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const key = `bba-avatars/${userId}.${ext}`;
  const arrayBuf = await file.arrayBuffer();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(arrayBuf),
        ContentType: file.type || "image/jpeg",
        CacheControl: "public, max-age=0, must-revalidate"
      })
    );

    const cleanBase = publicBaseUrl.replace(/\/$/, "");
    const url = `${cleanBase}/${key}?v=${Date.now()}`;
    return { ok: true, url, key };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "R2 upload failed";
    console.error("[r2] upload failed", msg);
    return { ok: false, error: msg };
  }
}

export async function deleteAvatarFromR2(key: string): Promise<void> {
  const client = getClient();
  if (!client || !bucket) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error("[r2] delete failed", err);
  }
}
