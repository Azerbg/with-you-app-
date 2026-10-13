/**
 * migrate-blobs.mjs
 * Migrates base64 data URIs stored in HrApplication (cvUrl, motivationLetterUrl,
 * certificateUrls) to Vercel Blob storage and updates the DB with the new URLs.
 *
 * Safe to run multiple times — only touches records that still contain base64 data.
 * Requires: DATABASE_URL, BLOB_READ_WRITE_TOKEN
 */

import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.log("[migrate-blobs] BLOB_READ_WRITE_TOKEN not set — skipping.");
  process.exit(0);
}

const db = new PrismaClient();

function isBase64DataUri(s) {
  return typeof s === "string" && s.startsWith("data:");
}

function mimeToExt(mime) {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("msword") || mime.includes("wordprocessing")) return "docx";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "bin";
}

async function uploadBase64(dataUri, pathname) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  const [, mimeType, b64] = match;
  const buffer = Buffer.from(b64, "base64");
  const blob = await put(pathname, buffer, { access: "public", contentType: mimeType });
  return blob.url;
}

async function main() {
  const apps = await db.hrApplication.findMany({
    select: { id: true, cvUrl: true, motivationLetterUrl: true, certificateUrls: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const app of apps) {
    const updates = {};

    if (isBase64DataUri(app.cvUrl)) {
      const match = app.cvUrl.match(/^data:([^;]+)/);
      const ext = mimeToExt(match?.[1] ?? "");
      const url = await uploadBase64(app.cvUrl, `hr/migrated/${app.id}/cv.${ext}`);
      if (url) updates.cvUrl = url;
    }

    if (isBase64DataUri(app.motivationLetterUrl)) {
      const match = app.motivationLetterUrl.match(/^data:([^;]+)/);
      const ext = mimeToExt(match?.[1] ?? "");
      const url = await uploadBase64(app.motivationLetterUrl, `hr/migrated/${app.id}/letter.${ext}`);
      if (url) updates.motivationLetterUrl = url;
    }

    const newCertUrls = [];
    let certChanged = false;
    for (let i = 0; i < app.certificateUrls.length; i++) {
      const cert = app.certificateUrls[i];
      if (isBase64DataUri(cert)) {
        const match = cert.match(/^data:([^;]+)/);
        const ext = mimeToExt(match?.[1] ?? "");
        const url = await uploadBase64(cert, `hr/migrated/${app.id}/cert_${i}.${ext}`);
        newCertUrls.push(url ?? cert);
        if (url) certChanged = true;
      } else {
        newCertUrls.push(cert);
      }
    }
    if (certChanged) updates.certificateUrls = newCertUrls;

    if (Object.keys(updates).length > 0) {
      await db.hrApplication.update({ where: { id: app.id }, data: updates });
      console.log(`[migrate-blobs] Migrated ${app.id}: ${Object.keys(updates).join(", ")}`);
      migrated++;
    } else {
      skipped++;
    }
  }

  console.log(`[migrate-blobs] Done. Migrated: ${migrated}, skipped: ${skipped}`);
  await db.$disconnect();
}

main().catch(err => {
  console.error("[migrate-blobs]", err);
  process.exit(1);
});
