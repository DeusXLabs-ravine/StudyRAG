// Cloudflare R2 (S3-compatible) blob storage.
// Replaces Supabase Storage for documents + podcast audio. Buckets are private;
// the app hands out short-lived presigned URLs for read + direct-upload.
const {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  r2Endpoint, r2AccessKeyId, r2SecretAccessKey, r2Bucket,
} = require('./env');

if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
  console.warn('[R2] Missing R2 configuration — blob storage operations will fail until R2_* env vars are set.');
}

const client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
});

const BUCKET = r2Bucket;

/** Upload a Buffer/Uint8Array to R2. */
async function uploadBuffer(key, body, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body,
    ContentType: contentType || 'application/octet-stream',
  }));
  return key;
}

/** Download an object as a Buffer. */
async function downloadBuffer(key) {
  const out = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of out.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Short-lived presigned GET url for rendering a file client-side. */
async function getSignedDownloadUrl(key, expiresIn = 1800) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

/**
 * Presigned PUT url so the frontend can upload the file body directly (HTTP PUT).
 * Content-Type is intentionally NOT signed: the client sends its own Content-Type
 * header (R2 stores it) and there is no signature mismatch to trip a 403. This keeps
 * both the single-file (real mime) and chunked (octet-stream) upload paths working
 * without the frontend having to echo an exact signed content type.
 */
async function getSignedUploadUrl(key, expiresIn = 1800) {
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn },
  );
}

/** Remove one or many objects. */
async function remove(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0) return;
  if (list.length === 1) {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: list[0] }));
    return;
  }
  await client.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: list.map(Key => ({ Key })), Quiet: true },
  }));
}

/** True if the object exists. */
async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  client, BUCKET,
  uploadBuffer, downloadBuffer, getSignedDownloadUrl, getSignedUploadUrl, remove, exists,
};
