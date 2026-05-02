import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, sendMedia } from "@/lib/evolution";
import { resolveTemplate, buildVarContext, getMissingVariables } from "@/lib/campaigns";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

/**
 * POST: dispara N envios em background, sequenciais com delay.
 * Body: { count: number, delayMs?: number, sentById?: string, assignedToId?: string }
 *  - count: quantos enviar nesta rodada
 *  - delayMs: intervalo entre cada envio (default = campaign.defaultDelayMs)
 *  - assignedToId: filtra só os pendentes atribuídos a este responsável (opcional)
 *
 * Responde imediatamente com { batched: N, total }; o trabalho continua em background.
 * Cada envio bem-sucedido emite SSE "campaigns" com { action: "sent", ... }.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { count, delayMs, sentById, assignedToId } = body;
  const n = Math.max(1, Math.min(Number(count) || 0, 1000));

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  const where: any = { campaignId: params.id, status: "PENDENTE" };
  if (assignedToId) where.assignedToId = assignedToId;

  const pendentes = await prisma.campaignContact.findMany({
    where,
    include: { contact: true },
    orderBy: { addedAt: "asc" },
    take: n,
  });

  if (pendentes.length === 0) return NextResponse.json({ batched: 0, total: 0 });

  const interval = Math.max(500, Number(delayMs) || campaign.defaultDelayMs || 2000);
  const ids = pendentes.map(p => p.id);

  // Marca como SENDING (status intermediário) — usamos a coluna status
  // Convenção: enquanto enviando, mantém PENDENTE pra evitar perder se der pau no servidor.
  // Se quiser status "SENDING" formal, pode adicionar enum/string depois.

  // Fire-and-forget
  (async () => {
    for (const cc of pendentes) {
      try {
        const ctx = await buildVarContext(cc.id);

        // Valida que todas as variáveis usadas no template têm valor
        const missing = getMissingVariables(campaign.messageTemplate, ctx);
        if (missing.length > 0) {
          await prisma.campaignContact.update({
            where: { id: cc.id },
            data: {
              status: "IGNOROU",
              notes: `[Variável faltando]: ${missing.map(v => `{{${v}}}`).join(", ")}`,
              respondedAt: new Date(),
            },
          });
          broadcast("campaigns", { action: "send-skipped", id: params.id, ccId: cc.id, missing });
          continue;
        }

        const finalMessage = resolveTemplate(campaign.messageTemplate, ctx);
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
          data: { status: "ENVIADO", sentAt: new Date(), sentById: sentById || null, sentMessage: finalMessage },
        });
        await prisma.contact.update({
          where: { id: cc.contactId },
          data: { lastContactAt: new Date(), lastMessage: finalMessage },
        });
        broadcast("campaigns", { action: "sent", id: params.id, ccId: cc.id });
      } catch (e: any) {
        // Marca como IGNOROU pra não tentar de novo automaticamente; log do erro em notes
        await prisma.campaignContact.update({
          where: { id: cc.id },
          data: { notes: `[Falha no envio]: ${e?.message ?? "erro"}` },
        });
        broadcast("campaigns", { action: "send-failed", id: params.id, ccId: cc.id, error: e?.message });
      }
      await new Promise(r => setTimeout(r, interval));
    }
    broadcast("campaigns", { action: "batch-finished", id: params.id, count: ids.length });
  })();

  return NextResponse.json({ batched: pendentes.length, delayMs: interval });
}
