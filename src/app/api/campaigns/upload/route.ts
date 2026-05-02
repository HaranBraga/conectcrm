import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ACCEPT_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPT_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES    = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo > 25MB" }, { status: 400 });

  const isImage = ACCEPT_IMAGE.includes(file.type);
  const isVideo = ACCEPT_VIDEO.includes(file.type);
  if (!isImage && !isVideo) return NextResponse.json({ error: "Tipo não suportado" }, { status: 400 });

  const ext = path.extname(file.name) || (isImage ? ".jpg" : ".mp4");
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "campaigns");
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  const publicUrl = `/campaigns/${filename}`;
  return NextResponse.json({
    url: publicUrl,
    type: isImage ? "image" : "video",
    size: file.size,
  });
}
