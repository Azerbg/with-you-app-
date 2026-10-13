/**
 * migrate-blobs.mjs
 *
 * Two idempotent build-time migrations:
 *
 * 1. BLOB MIGRATION — Uploads base64 data URIs stored in HrApplication
 *    (cvUrl, motivationLetterUrl, certificateUrls) to Vercel Blob as private
 *    blobs and replaces the DB value with the Blob URL.
 *    Safe to run multiple times — only touches rows that still contain base64.
 *    Requires: DATABASE_URL, BLOB_READ_WRITE_TOKEN
 *
 * 2. VIDEO STATUS ROLLBACK — Moves any APPLICATION that is in VIDEO_SUBMITTED
 *    status but has no videoSubmissionUrl back to VIDEO_REQUESTED.
 *    This fixes rows that were manually moved to VIDEO_SUBMITTED before the
 *    server-side guard was added.
 *    Requires: DATABASE_URL
 */

import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const db = new PrismaClient();

// ─── 1. Blob migration ────────────────────────────────────────────────────────

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
  // Documents are uploaded as private; keep videos public (needed for HR player)
  const isVideo = mimeType.startsWith("video/");
  const blob = await put(pathname, buffer, {
    access: isVideo ? "public" : "private",
    contentType: mimeType,
    allowOverwrite: true,
  });
  return blob.url;
}

async function migrateBlobs() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("[migrate-blobs] BLOB_READ_WRITE_TOKEN not set — skipping blob migration.");
    return;
  }

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

  console.log(`[migrate-blobs] Blob migration done. Migrated: ${migrated}, skipped: ${skipped}`);
}

// ─── 2. Video status rollback ─────────────────────────────────────────────────

async function rollbackVideoStatus() {
  const stale = await db.hrApplication.findMany({
    where: { status: "VIDEO_SUBMITTED", videoSubmissionUrl: null },
    select: { id: true, fullName: true },
  });

  if (stale.length === 0) {
    console.log("[migrate-blobs] Video status rollback: nothing to fix.");
    return;
  }

  const ids = stale.map(a => a.id);
  await db.hrApplication.updateMany({
    where: { id: { in: ids } },
    data: { status: "VIDEO_REQUESTED" },
  });

  for (const a of stale) {
    console.log(`[migrate-blobs] Rolled back ${a.id} (${a.fullName}): VIDEO_SUBMITTED → VIDEO_REQUESTED`);
  }
  console.log(`[migrate-blobs] Video status rollback done. Fixed: ${stale.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await migrateBlobs();
  await rollbackVideoStatus();
  await db.$disconnect();
}

main().catch(err => {
  console.error("[migrate-blobs]", err);
  process.exit(1);
});
