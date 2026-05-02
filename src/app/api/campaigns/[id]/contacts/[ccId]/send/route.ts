import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, sendMedia } from "@/lib/evolution";
import { resolveTemplate, buildVarContext } from "@/lib/campaigns";
import { broadcast } from "@/lib/sse";

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
    if (campaign.mediaUrl && campaign.mediaType) {
      const caption = campaign.linkUrl ? `${finalMessage}\n\n${campaign.linkUrl}` : finalMessage;
      await sendMedia(cc.contact.phone, campaign.mediaUrl, campaign.mediaType as "image" | "video", caption);
    } else if (campaign.linkUrl) {
      await sendText(cc.contact.phone, `${finalMessage}\n\n${campaign.linkUrl}`);
    } else {
      await sendText(cc.contact.phone, finalMessage);
    }

    await prisma.campaignContact.update({
      where: { id: cc.id },
      data: {
        status: "ENVIADO",
        sentAt: new Date(),
        sentById: sentById || null,
        sentMessage: finalMessage,
      },
    });

    await prisma.contact.update({
      where: { id: cc.contactId },
      data: { lastContactAt: new Date(), lastMessage: finalMessage },
    });

    broadcast("campaigns", { action: "sent", id: params.id });
    return NextResponse.json({ ok: true, message: finalMessage });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro ao enviar" }, { status: 500 });
  }
}
