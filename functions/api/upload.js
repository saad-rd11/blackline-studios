import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const R2_ACCESS_KEY_ID = context.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = context.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = context.env.R2_BUCKET_NAME;
  const R2_ENDPOINT = context.env.R2_ENDPOINT;
  const R2_PUBLIC_URL = context.env.R2_PUBLIC_URL;

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return new Response("R2 not configured", { status: 500 });
  }

  try {
    const formData = await context.request.formData();
    const file = formData.get("image");
    if (!file) {
      return new Response("No image provided", { status: 400 });
    }

    const ext = "webp";
    const key = `portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const s3 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(`Upload error: ${e.message}`, { status: 500 });
  }
}
