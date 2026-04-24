import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMediaBase64 } from "@/lib/evolution";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message?.rawData) return NextResponse.json({ error: "Sem mídia" }, { status: 404 });

  const media = await getMediaBase64(message.rawData);
  if (!media?.base64) return NextResponse.json({ error: "Não foi possível buscar mídia" }, { status: 502 });

  const buffer = Buffer.from(media.base64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": media.mimetype,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
