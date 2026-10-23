import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "application/json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export interface SavedFileResult {
  storagePath: string;
  storageKey: string;
  fileHashSha256: string;
  fileSize: number;
  mimeType: string;
  driver: "local" | "s3";
}

function getS3Client(): { client: S3Client; bucket: string } | null {
  const driver = process.env.STORAGE_DRIVER?.toLowerCase();
  const bucket = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || "ap-south-1";
  const endpoint = process.env.S3_ENDPOINT;

  if (driver !== "s3" || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint), // Needed for MinIO / Cloudflare R2
  });

  return { client, bucket };
}

/**
 * Validates, hashes, and persists a confidential financial document to isolated storage.
 */
export async function saveDocumentFile(
  organizationId: string,
  filename: string,
  buffer: Buffer,
  declaredMimeType?: string
): Promise<SavedFileResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds 25 MB limit.`);
  }

  // Derive and validate mime type
  const ext = path.extname(filename).toLowerCase();
  let mimeType = declaredMimeType || "application/octet-stream";
  if (ext === ".pdf") mimeType = "application/pdf";
  else if (ext === ".csv") mimeType = "text/csv";
  else if (ext === ".tsv") mimeType = "text/tab-separated-values";
  else if (ext === ".xlsx") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  else if (ext === ".xls") mimeType = "application/vnd.ms-excel";
  else if (ext === ".json") mimeType = "application/json";
  else if (ext === ".png") mimeType = "image/png";
  else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file format: ${mimeType}. Allowed formats: PDF, CSV, TSV, XLSX, XLS, JSON, PNG, JPEG.`);
  }

  // Calculate cryptographic SHA-256 hash
  const fileHashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // Storage key: orgId/timestamp-random-basename
  const uniquePrefix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const safeBaseName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `${uniquePrefix}_${safeBaseName}`;

  const s3Config = getS3Client();

  if (s3Config) {
    // S3 / Cloudflare R2 Storage (Tenant-scoped object key)
    const s3Key = `${organizationId}/${storageKey}`;
    await s3Config.client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          organizationId,
          originalFilename: encodeURIComponent(filename),
          sha256: fileHashSha256,
        },
      })
    );

    return {
      storagePath: `s3://${s3Config.bucket}/${s3Key}`,
      storageKey,
      fileHashSha256,
      fileSize: buffer.length,
      mimeType,
      driver: "s3",
    };
  }

  // Local Filesystem Storage (Tenant-isolated folder)
  const uploadsBaseDir = process.env.LOCAL_STORAGE_DIR || "./uploads";
  const orgDir = path.join(process.cwd(), uploadsBaseDir, organizationId);

  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true });
  }

  const fullPath = path.join(orgDir, storageKey);
  fs.writeFileSync(fullPath, buffer);

  return {
    storagePath: fullPath,
    storageKey,
    fileHashSha256,
    fileSize: buffer.length,
    mimeType,
    driver: "local",
  };
}

/**
 * Retrieves document bytes from authorized storage.
 */
export async function readDocumentFile(organizationId: string, storageKey: string): Promise<Buffer> {
  // Prevent directory traversal attacks
  const safeKey = path.basename(storageKey);

  const s3Config = getS3Client();
  if (s3Config) {
    const s3Key = `${organizationId}/${safeKey}`;
    const res = await s3Config.client.send(
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Key,
      })
    );
    const stream = res.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // Local filesystem
  const uploadsBaseDir = process.env.LOCAL_STORAGE_DIR || "./uploads";
  const fullPath = path.join(process.cwd(), uploadsBaseDir, organizationId, safeKey);

  if (!fs.existsSync(fullPath)) {
    throw new Error("File not found on storage disk.");
  }

  return fs.readFileSync(fullPath);
}

/**
 * Generates an authorized, short-lived signed URL for private S3 downloads.
 * Returns null if running on local filesystem (where streaming API is used).
 */
export async function getPresignedDownloadUrl(
  organizationId: string,
  storageKey: string,
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string | null> {
  const s3Config = getS3Client();
  if (!s3Config) return null;

  const safeKey = path.basename(storageKey);
  const s3Key = `${organizationId}/${safeKey}`;

  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: s3Key,
  });

  return getSignedUrl(s3Config.client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes a document file from storage.
 */
export async function deleteDocumentFile(organizationId: string, storageKey: string): Promise<void> {
  const safeKey = path.basename(storageKey);
  const s3Config = getS3Client();

  if (s3Config) {
    const s3Key = `${organizationId}/${safeKey}`;
    await s3Config.client.send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Key,
      })
    );
    return;
  }

  const uploadsBaseDir = process.env.LOCAL_STORAGE_DIR || "./uploads";
  const fullPath = path.join(process.cwd(), uploadsBaseDir, organizationId, safeKey);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
