import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED: Record<string, "image" | "pdf" | "audio"> = {
  "image/jpeg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/svg+xml": "image",
  "application/pdf": "pdf",
  "audio/webm": "audio", "audio/ogg": "audio", "audio/mp4": "audio",
  "audio/mpeg": "audio", "audio/wav": "audio",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });
    const kind = ALLOWED[file.type];
    if (!kind) return NextResponse.json({ error: "File type not allowed" }, { status: 415 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`messages/${session.user.id}/${Date.now()}_${safeName}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url, type: kind });
  } catch (err) {
    console.error("[messages/upload]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
