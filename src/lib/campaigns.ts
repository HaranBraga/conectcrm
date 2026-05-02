import { prisma } from "@/lib/prisma";

export const CAMPAIGN_VARIABLES = [
  { key: "nome",          label: "Nome completo do contato" },
  { key: "primeiroNome",  label: "Primeiro nome do contato" },
  { key: "telefone",      label: "Telefone do contato" },
  { key: "lider",         label: "Nome do líder atribuído (ou pai do contato)" },
  { key: "primeiroLider", label: "Primeiro nome do líder" },
] as const;

export type CampaignVarContext = {
  contactName?: string | null;
  contactPhone?: string | null;
  liderName?: string | null;
};

export function resolveTemplate(template: string, ctx: CampaignVarContext): string {
  const first = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : "");
  const map: Record<string, string> = {
    nome:          ctx.contactName ?? "",
    primeiroNome:  first(ctx.contactName),
    telefone:      ctx.contactPhone ?? "",
    lider:         ctx.liderName ?? "",
    primeiroLider: first(ctx.liderName),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}

/**
 * Busca o contexto de variáveis de um CampaignContact, usando assignedTo
 * se setado, senão o parent (líder padrão) do contato.
 */
export async function buildVarContext(campaignContactId: string): Promise<CampaignVarContext> {
  const cc = await prisma.campaignContact.findUnique({
    where: { id: campaignContactId },
    include: {
      contact:    { include: { parent: { select: { name: true } } } },
      assignedTo: { select: { name: true } },
    },
  });
  if (!cc) return {};
  return {
    contactName:  cc.contact.name,
    contactPhone: cc.contact.phone,
    liderName:    cc.assignedTo?.name ?? cc.contact.parent?.name ?? null,
  };
}
