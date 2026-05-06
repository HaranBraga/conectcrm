import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/evolution";
import { resolveTemplate, recordOutgoingInConversation } from "@/lib/campaigns";
import { broadcast } from "@/lib/sse";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Envia mensagem de aniversário pra um contato.
 * Body: { contactId, message? } — se message não vier, usa o template salvo.
 *
 * Registra em BirthdayMessage (unique [contactId, year]) — se já existe
 * pro ano corrente, retorna 409.
 */
export async function POST(req: NextRequest) {
  const { contactId, message: customMessage } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId obrigatório" }, { status: 400 });

  const year = new Date().getFullYear();
  const existing = await prisma.birthdayMessage.findUnique({
    where: { contactId_year: { contactId, year } },
  });
  if (existing) {
    return NextResponse.json({ error: "Mensagem de aniversário já enviada este ano para este contato" }, { status: 409 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { parent: { select: { name: true } } },
  });
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });

  // Template: usa o customMessage, ou busca no AppConfig, ou default
  let template = customMessage;
  if (!template) {
    const cfg = await prisma.appConfig.findUnique({ where: { key: "birthday_template" } });
    template = cfg?.value ?? "Feliz aniversário, {{primeiroNome}}! 🎉";
  }

  const ctx = {
    contactName: contact.name,
    contactPhone: contact.phone,
    liderName: contact.parent?.name ?? null,
  };
  const finalMessage = resolveTemplate(template, ctx);

  let result: any;
  try {
    result = await sendText(contact.phone, finalMessage);
  } catch (e: any) {
    const detail = e?.response?.data?.message ?? e?.message ?? "erro desconhecido";
    return NextResponse.json({ error: `Falha no envio: ${detail}` }, { status: 502 });
  }
  const whatsappMsgId: string | undefined = result?.key?.id;

  await prisma.birthdayMessage.create({
    data: { contactId, year, message: finalMessage },
  });

  // Garante presença no Kanban + registra mensagem na conversa
  await recordOutgoingInConversation({
    contactId,
    content: finalMessage,
    whatsappMsgId,
    broadcaster: broadcast,
  });

  broadcast("birthdays", { action: "sent", contactId });

  await logAudit({
    action: "birthday.send",
    entity: "Contact",
    entityId: contactId,
    summary: `Enviou aniversário para ${contact.name}`,
    meta: { phone: contact.phone, year },
    req,
  });

  return NextResponse.json({ ok: true, message: finalMessage });
}
