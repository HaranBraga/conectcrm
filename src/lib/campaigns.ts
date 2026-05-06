import { prisma } from "@/lib/prisma";

/**
 * Garante que uma tag automática existe na campanha — usada pra marcar
 * envios que falharam ou foram ignorados (variável faltando), facilitando
 * o filtro depois. Find-or-create por label.
 */
export async function ensureAutoTag(
  campaignId: string,
  kind: "error" | "missing-var",
): Promise<string> {
  const presets = {
    "error":       { label: "Falhou no envio",   color: "#dc2626", bgColor: "#fee2e2" },
    "missing-var": { label: "Variável faltando", color: "#d97706", bgColor: "#fef3c7" },
  } as const;
  const preset = presets[kind];

  const existing = await prisma.campaignResponseTag.findFirst({
    where: { campaignId, label: preset.label },
    select: { id: true },
  });
  if (existing) return existing.id;

  const last = await prisma.campaignResponseTag.findFirst({
    where: { campaignId }, orderBy: { order: "desc" }, select: { order: true },
  });
  const created = await prisma.campaignResponseTag.create({
    data: {
      campaignId,
      label: preset.label,
      color: preset.color,
      bgColor: preset.bgColor,
      order: (last?.order ?? -1) + 1,
    },
  });
  return created.id;
}

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

function buildVarMap(ctx: CampaignVarContext): Record<string, string> {
  const first = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : "");
  return {
    nome:          ctx.contactName ?? "",
    primeiroNome:  first(ctx.contactName),
    telefone:      ctx.contactPhone ?? "",
    lider:         ctx.liderName ?? "",
    primeiroLider: first(ctx.liderName),
  };
}

export function resolveTemplate(template: string, ctx: CampaignVarContext): string {
  const map = buildVarMap(ctx);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}

/**
 * Retorna lista de variáveis usadas no template que estão vazias no contexto.
 * Útil para abortar envio quando há campos personalizados faltando.
 */
export function getMissingVariables(template: string, ctx: CampaignVarContext): string[] {
  const map = buildVarMap(ctx);
  const used = new Set<string>();
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => { used.add(k); return ""; });
  return Array.from(used).filter(k => !map[k] || !map[k].trim());
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
