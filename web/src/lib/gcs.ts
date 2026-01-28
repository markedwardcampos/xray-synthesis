import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: (process.env.GCP_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
});

const bucketName = process.env.GCS_BUCKET_NAME || "";

export async function uploadToGCS(
  path: string,
  content: string | Buffer,
  contentType: string = "text/plain"
) {
  if (!bucketName) throw new Error("GCS_BUCKET_NAME is not defined");

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(path);

  await file.save(content, {
    metadata: { contentType },
    resumable: false,
  });

  console.log(`[GCS] Uploaded to gs://${bucketName}/${path}`);
  return `https://storage.googleapis.com/${bucketName}/${path}`;
}
