import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

// Gera todas as variantes de formato para tentar na Evolution API
function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const s = new Set<string>([digits]);

  if (digits.startsWith("55")) {
    const no55 = digits.slice(2);
    s.add(no55);
    if (digits.length === 13) {
      // Com 9º: 55+DDD+9+8 → sem 9: 55+DDD+8
      s.add(`${digits.slice(0, 4)}${digits.slice(5)}`);
      // Sem 55, sem 9: DDD+8
      s.add(`${no55.slice(0, 2)}${no55.slice(3)}`);
    }
    if (digits.length === 12) {
      // Sem 9º: 55+DDD+8 → com 9: 55+DDD+9+8
      s.add(`${digits.slice(0, 4)}9${digits.slice(4)}`);
      s.add(no55);
      s.add(`${no55.slice(0, 2)}9${no55.slice(2)}`);
    }
  } else {
    s.add(`55${digits}`);
    if (digits.length === 11 && digits[2] === "9") {
      s.add(`${digits.slice(0, 2)}${digits.slice(3)}`);
      s.add(`55${digits.slice(0, 2)}${digits.slice(3)}`);
    }
    if (digits.length === 10) {
      s.add(`${digits.slice(0, 2)}9${digits.slice(2)}`);
      s.add(`55${digits.slice(0, 2)}9${digits.slice(2)}`);
    }
  }
  return Array.from(s);
}

async function fetchPhoto(number: string, base: string, instance: string, key: string): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${base}/chat/fetchProfilePictureUrl/${instance}`,
      { number: `${number}@s.whatsapp.net` },
      { headers: { apikey: key }, timeout: 5000 }
    );
    return data?.profilePictureUrl ?? data?.url ?? null;
  } catch {
    return null;
  }
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const BASE_URL = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const API_KEY  = process.env.EVOLUTION_API_KEY ?? "";
  const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

  const variants = phoneVariants(contact.phone);
  let url: string | null = null;

  for (const variant of variants) {
    url = await fetchPhoto(variant, BASE_URL, INSTANCE, API_KEY);
    if (url) break;
  }

  if (url) {
    await prisma.contact.update({ where: { id: params.id }, data: { profilePhotoUrl: url } });
  }
  return NextResponse.json({ url });
}
