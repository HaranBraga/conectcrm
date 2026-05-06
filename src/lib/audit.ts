import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

/**
 * Catálogo das ações de auditoria. Mantenha string estável — é o filtro da UI.
 */
export type AuditAction =
  | "user.login"          // login OK
  | "user.login_failed"   // login negado
  | "user.logout"
  | "user.password_change"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "campaign.create"
  | "campaign.update"
  | "campaign.delete"
  | "campaign.send"          // envio individual
  | "campaign.batch_send"    // envio em lote
  | "birthday.send"
  | "demanda.create"
  | "demanda.update"
  | "demanda.delete"
  | "reuniao.create"
  | "reuniao.update"
  | "reuniao.delete"
  | "agenda.create"
  | "agenda.update"
  | "agenda.delete"
  | "kanban.move"            // mover conversation entre status
  | "config.update"          // mudanças em /configuracoes
  ;

export type LogAuditInput = {
  action: AuditAction;
  entity?: string;
  entityId?: string;
  summary?: string;
  meta?: Record<string, unknown>;
  /** Sobrescreve o user atual (ex: durante login, antes de cookie ser setado) */
  user?: { id: string; name: string } | null;
  req?: NextRequest | Request;
};

function getIp(req?: NextRequest | Request): string | null {
  if (!req) return null;
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

function getUA(req?: NextRequest | Request): string | null {
  if (!req) return null;
  return req.headers.get("user-agent");
}

/**
 * Grava um log de auditoria. Não falha a requisição se der erro — só loga
 * o problema e segue.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    let userId: string | null = null;
    let userName: string | null = null;
    if (input.user !== undefined) {
      userId   = input.user?.id ?? null;
      userName = input.user?.name ?? null;
    } else {
      const cur: CurrentUser | null = await getCurrentUser();
      userId   = cur?.id ?? null;
      userName = cur?.name ?? null;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action:    input.action,
        entity:    input.entity   ?? null,
        entityId:  input.entityId ?? null,
        summary:   input.summary  ?? null,
        meta:      (input.meta ?? null) as any,
        ipAddress: getIp(input.req),
        userAgent: getUA(input.req),
      },
    });
  } catch (err) {
    console.error("[logAudit] falha ao registrar log:", err);
  }
}

/**
 * Retorna um label amigável pra cada ação. Usado na UI.
 */
export const ACTION_LABELS: Record<AuditAction, string> = {
  "user.login":            "Login efetuado",
  "user.login_failed":     "Falha de login",
  "user.logout":           "Logout",
  "user.password_change":  "Trocou a senha",
  "user.create":           "Criou usuário",
  "user.update":           "Atualizou usuário",
  "user.delete":           "Excluiu usuário",
  "contact.create":        "Criou contato",
  "contact.update":        "Atualizou contato",
  "contact.delete":        "Excluiu contato",
  "campaign.create":       "Criou campanha",
  "campaign.update":       "Atualizou campanha",
  "campaign.delete":       "Excluiu campanha",
  "campaign.send":         "Enviou mensagem da campanha",
  "campaign.batch_send":   "Iniciou envio em lote",
  "birthday.send":         "Enviou aniversário",
  "demanda.create":        "Criou demanda",
  "demanda.update":        "Atualizou demanda",
  "demanda.delete":        "Excluiu demanda",
  "reuniao.create":        "Criou reunião",
  "reuniao.update":        "Atualizou reunião",
  "reuniao.delete":        "Excluiu reunião",
  "agenda.create":         "Criou evento",
  "agenda.update":         "Atualizou evento",
  "agenda.delete":         "Excluiu evento",
  "kanban.move":           "Moveu card no kanban",
  "config.update":         "Mudou configuração",
};
