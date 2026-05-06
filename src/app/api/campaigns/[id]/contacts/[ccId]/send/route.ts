import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, sendMedia } from "@/lib/evolution";
import { resolveTemplate, buildVarContext, ensureAutoTag, recordOutgoingInConversation } from "@/lib/campaigns";
import { broadcast } from "@/lib/sse";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Envia a mensagem da campanha para um CampaignContact específico.
 * Body opcional: { sentById?: string, overrideMessage?: string }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string; ccId: string } }) {
  const body = await req.json().catch(() => ({}));
  const { sentById, overrideMessage } = body;

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  const cc = await prisma.campaignContact.findUnique({
    where: { id: params.ccId },
    include: { contact: true },
  });
  if (!cc) return NextResponse.json({ error: "Contato não encontrado na campanha" }, { status: 404 });
  if (cc.status !== "PENDENTE") return NextResponse.json({ error: "Contato já foi processado" }, { status: 400 });

  const ctx = await buildVarContext(cc.id);
  const template = overrideMessage?.trim() ? overrideMessage : campaign.messageTemplate;
  const finalMessage = resolveTemplate(template, ctx);

  try {
    let result: any;
    let savedMediaType: string | null = null;
    if (campaign.mediaUrl && campaign.mediaType) {
      const caption = campaign.linkUrl ? `${finalMessage}\n\n${campaign.linkUrl}` : finalMessage;
      result = await sendMedia(cc.contact.phone, campaign.mediaUrl, campaign.mediaType as "image" | "video", caption);
      savedMediaType = campaign.mediaType;
    } else if (campaign.linkUrl) {
      result = await sendText(cc.contact.phone, `${finalMessage}\n\n${campaign.linkUrl}`);
    } else {
      result = await sendText(cc.contact.phone, finalMessage);
    }
    const whatsappMsgId: string | undefined = result?.key?.id;

    await prisma.campaignContact.update({
      where: { id: cc.id },
      data: {
        status: "ENVIADO",
        sentAt: new Date(),
        sentById: sentById || null,
        sentMessage: finalMessage,
      },
    });

    // Garante presença no Kanban e mensagem registrada na Conversa
    await recordOutgoingInConversation({
      contactId: cc.contactId,
      content: finalMessage,
      mediaType: savedMediaType,
      whatsappMsgId,
      broadcaster: broadcast,
    });

    broadcast("campaigns", { action: "sent", id: params.id });

    await logAudit({
      action: "campaign.send",
      entity: "Campaign",
      entityId: params.id,
      summary: `Enviou para ${cc.contact.name} (campanha "${campaign.name}")`,
      meta: { ccId: cc.id, contactId: cc.contactId, phone: cc.contact.phone },
      req,
    });

    return NextResponse.json({ ok: true, message: finalMessage });
  } catch (e: any) {
    // Marca como FALHOU + tag automática pra facilitar filtrar depois
    const tagId = await ensureAutoTag(params.id, "error").catch(() => null);
    await prisma.campaignContact.update({
      where: { id: cc.id },
      data: {
        status: "FALHOU",
        respondedAt: new Date(),
        notes: `[Falha no envio]: ${e?.message ?? "erro desconhecido"}`,
        responseTagId: tagId,
      },
    }).catch(() => {});
    broadcast("campaigns", { action: "send-failed", id: params.id, ccId: cc.id, error: e?.message });
    return NextResponse.json({ error: e?.message ?? "Erro ao enviar" }, { status: 500 });
  }
}
