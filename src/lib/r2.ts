import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// --- Validation ---

const MEDIA_TYPES: Record<string, { ext: string; fileType: 'image' | 'video' | 'document'; maxSize: number; maxSizeLabel: string }> = {
  'image/png':        { ext: 'png',  fileType: 'image',    maxSize: 5 * 1024 * 1024,  maxSizeLabel: '5MB' },
  'image/jpeg':       { ext: 'jpg',  fileType: 'image',    maxSize: 5 * 1024 * 1024,  maxSizeLabel: '5MB' },
  'image/webp':       { ext: 'webp', fileType: 'image',    maxSize: 5 * 1024 * 1024,  maxSizeLabel: '5MB' },
  'video/mp4':        { ext: 'mp4',  fileType: 'video',    maxSize: 50 * 1024 * 1024, maxSizeLabel: '50MB' },
  'video/webm':       { ext: 'webm', fileType: 'video',    maxSize: 50 * 1024 * 1024, maxSizeLabel: '50MB' },
  'application/pdf':  { ext: 'pdf',  fileType: 'document', maxSize: 10 * 1024 * 1024, maxSizeLabel: '10MB' },
};

export function validateMediaFile(file: File): { error: string | null; fileType: string; ext: string } {
  const config = MEDIA_TYPES[file.type];

  if (!config) {
    return { error: 'Unsupported file type. Allowed: PNG, JPEG, WebP, MP4, WebM, PDF', fileType: '', ext: '' };
  }

  if (file.size > config.maxSize) {
    return { error: `File too large. Max size for ${config.fileType}: ${config.maxSizeLabel}`, fileType: config.fileType, ext: config.ext };
  }

  return { error: null, fileType: config.fileType, ext: config.ext };
}

// --- R2 Client ---

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function generateKey(companyId: string, ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${companyId}/${timestamp}-${random}.${ext}`;
}

export async function uploadMediaToR2(
  companyId: string,
  file: File
): Promise<{ url: string; fileType: 'image' | 'video' | 'document'; mimeType: string; fileSize: number }> {
  const validation = validateMediaFile(file);
  if (validation.error) {
    throw new Error(validation.error);
  }

  const key = generateKey(companyId, validation.ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;

  return {
    url,
    fileType: validation.fileType as 'image' | 'video' | 'document',
    mimeType: file.type,
    fileSize: file.size,
  };
}

export async function deleteMediaFromR2(fileUrl: string): Promise<void> {
  const publicUrl = process.env.R2_PUBLIC_URL!;
  if (!fileUrl.startsWith(publicUrl)) {
    console.error('Invalid R2 URL:', fileUrl);
    return;
  }

  const key = fileUrl.slice(publicUrl.length + 1);

  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
}
