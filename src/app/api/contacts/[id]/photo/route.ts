import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const BASE_URL = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const API_KEY  = process.env.EVOLUTION_API_KEY ?? "";
  const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

  try {
    const number = contact.phone.replace(/\D/g, "");
    const { data } = await axios.post(
      `${BASE_URL}/chat/fetchProfilePictureUrl/${INSTANCE}`,
      { number: `${number}@s.whatsapp.net` },
      { headers: { apikey: API_KEY } }
    );

    const url: string | null = data?.profilePictureUrl ?? data?.url ?? null;
    if (url) {
      await prisma.contact.update({ where: { id: params.id }, data: { profilePhotoUrl: url } });
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
