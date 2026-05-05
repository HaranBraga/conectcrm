import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TEMPLATE = "Feliz aniversário, {{primeiroNome}}! 🎉🎂\n\nQue este novo ciclo seja repleto de saúde e realizações. Um abraço!";

export async function GET() {
  const cfg = await prisma.appConfig.findUnique({ where: { key: "birthday_template" } });
  return NextResponse.json({ template: cfg?.value ?? DEFAULT_TEMPLATE });
}

export async function PUT(req: NextRequest) {
  const { template } = await req.json();
  if (typeof template !== "string") {
    return NextResponse.json({ error: "template obrigatório" }, { status: 400 });
  }
  await prisma.appConfig.upsert({
    where: { key: "birthday_template" },
    update: { value: template },
    create: { key: "birthday_template", value: template },
  });
  return NextResponse.json({ ok: true, template });
}
