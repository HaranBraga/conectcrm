"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, MapPin, Users, Home as HomeIcon, UserCheck, Send,
  Save, Trash2, Tag, MessageSquare, X, AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const MODES = [
  { key: "anfitrioes", label: "Anfitriões",  icon: HomeIcon, color: "amber"  },
  { key: "presentes",  label: "Presentes",   icon: UserCheck, color: "indigo" },
  { key: "all",        label: "Todos",       icon: Users,    color: "brand"  },
] as const;
type Mode = (typeof MODES)[number]["key"];

const VARIABLES = [
  { key: "primeiroNome",  label: "Primeiro nome" },
  { key: "nome",          label: "Nome completo" },
  { key: "primeiroLider", label: "Primeiro nome do líder" },
  { key: "lider",         label: "Líder (completo)" },
  { key: "telefone",      label: "Telefone" },
];

// ─── Modal de envio em LOTE ──────────────────────────────────────────────────

function BatchModal({ campaign, totalPendentes, onClose, onStarted }: any) {
  const [count, setCount] = useState(Math.min(50, totalPendentes));
  const [delaySec, setDelaySec] = useState(3);
  const [sending, setSending] = useState(false);
  const minutes = Math.round((count * delaySec) / 60);

  async function start() {
    setSending(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/batch-send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, delayMs: delaySec * 1000 }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`Lote de ${d.batched} envios iniciado em background!`);
      onStarted(); onClose();
    } finally { setSending(false); }
  }

  return (
    <Modal open title="Enviar em lote" onClose={onClose} size="md">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-gray-600">Há <strong>{totalPendentes}</strong> pendentes neste disparo.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantos enviar agora?</label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={totalPendentes} value={count}
              onChange={e => setCount(Math.max(1, Math.min(totalPendentes, Number(e.target.value) || 1)))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input type="range" min={1} max={totalPendentes} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="flex-1 accent-brand-600" />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[10, 50, 100, 250, 500, 1000].filter(n => n <= totalPendentes).map(n => (
              <button key={n} onClick={() => setCount(n)} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-300">{n}</button>
            ))}
            {totalPendentes <= 1000 && (
              <button onClick={() => setCount(totalPendentes)} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-300">Todos ({totalPendentes})</button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo entre envios</label>
          <div className="flex gap-1.5 flex-wrap">
            {[2, 3, 5, 8, 12, 20].map(s => (
              <button key={s} onClick={() => setDelaySec(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${delaySec === s ? "bg-brand-600 text-white border-transparent" : "text-gray-600 border-gray-200 bg-white"}`}>
                {s}s
              </button>
            ))}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
          <p>Estimativa: <strong>~{minutes} min</strong>. O envio roda em background.</p>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={start} disabled={sending || count < 1} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <Send size={14} /> {sending ? "Iniciando..." : `Enviar ${count}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de envio individual ───────────────────────────────────────────────

function SendOneModal({ cc, campaign, onClose, onSent }: any) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  function preview(t: string) {
    const first = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : "");
    const map: Record<string, string> = {
      nome: cc.contact?.name ?? "",
      primeiroNome: first(cc.contact?.name),
      telefone: cc.contact?.phone ?? "",
      lider: cc.assignedTo?.name ?? cc.contact?.parent?.name ?? "",
      primeiroLider: first(cc.assignedTo?.name ?? cc.contact?.parent?.name),
    };
    return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
  }

  useEffect(() => { setMsg(preview(campaign.messageTemplate)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cc, campaign.messageTemplate]);

  async function send() {
    setSending(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/contacts/${cc.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideMessage: msg }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Enviado");
      onSent(); onClose();
    } finally { setSending(false); }
  }

  return (
    <Modal open title={`Enviar para ${cc.contact.name}`} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p><strong>Telefone:</strong> {cc.contact.phone}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (já personalizada)</label>
          <textarea rows={6} value={msg} onChange={e => setMsg(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={send} disabled={sending || !msg.trim()} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <Send size={14} /> {sending ? "Enviando..." : "Enviar agora"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Linha de contato ────────────────────────────────────────────────────────

function ContactRow({ cc, campaign, tags, onSend, onPatch, onDelete }: any) {
  const router = useRouter();
  const [showTags, setShowTags] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);
  const tag = cc.responseTag;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!tagRef.current?.contains(e.target as Node)) setShowTags(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 text-sm truncate">{cc.contact.name}</p>
          {cc.contact.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: cc.contact.role.color, backgroundColor: cc.contact.role.bgColor }}>{cc.contact.role.label}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          <span>{cc.contact.phone}</span>
          {cc.sentAt && <span>Enviado {format(new Date(cc.sentAt), "dd/MM HH:mm")}</span>}
        </div>
      </div>

      {cc.status === "FALHOU" && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-red-50 text-red-600 border border-red-200" title={cc.notes ?? ""}>falhou</span>}
      {cc.status === "IGNOROU" && !tag && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-amber-50 text-amber-700 border border-amber-200" title={cc.notes ?? ""}>ignorado</span>}
      {tag && <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ color: tag.color, backgroundColor: tag.bgColor }}>{tag.label}</span>}

      {cc.status === "PENDENTE" && (
        <button onClick={() => onSend(cc)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium shrink-0">
          <Send size={12} /> Enviar
        </button>
      )}

      {cc.status !== "PENDENTE" && tags.length > 0 && (
        <div className="relative" ref={tagRef}>
          <button onClick={() => setShowTags(s => !s)} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs shrink-0">
            <Tag size={11} /> {tag ? "Mudar" : "Etiquetar"}
          </button>
          {showTags && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56 max-h-60 overflow-y-auto">
              {tags.map((t: any) => (
                <button key={t.id} onClick={() => { onPatch(cc.id, { responseTagId: t.id, status: "RESPONDEU" }); setShowTags(false); }} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} /> <span>{t.label}</span>
                </button>
              ))}
              {tag && (
                <button onClick={() => { onPatch(cc.id, { responseTagId: null }); setShowTags(false); }} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left text-red-500 border-t border-gray-100 mt-1 pt-1.5">
                  <X size={11} /> Remover
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => router.push(`/conversas?contactId=${cc.contactId}`)} title="Abrir conversa" className="p-1.5 text-gray-400 hover:text-brand-600 shrink-0">
        <MessageSquare size={14} />
      </button>
      <button onClick={() => onDelete(cc.id)} title="Remover do disparo" className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Painel da aba ativa ─────────────────────────────────────────────────────

function ModeTab({ reuniao, mode, campaign, onCampaignCreated, onChange }: {
  reuniao: any; mode: Mode; campaign: any | null;
  onCampaignCreated: () => void; onChange: () => void;
}) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [sendCc, setSendCc] = useState<any | null>(null);

  // Editor de template
  const [template, setTemplate] = useState(campaign?.messageTemplate ?? "");
  const [savingTpl, setSavingTpl] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTemplate(campaign?.messageTemplate ?? ""); }, [campaign?.id, campaign?.messageTemplate]);

  const loadContacts = useCallback(async () => {
    if (!campaign?.id) { setContacts([]); setContactsTotal(0); return; }
    const r = await fetch(`/api/campaigns/${campaign.id}/contacts?limit=500`);
    const d = await r.json();
    setContacts(d.items ?? []);
    setContactsTotal(d.total ?? 0);
  }, [campaign?.id]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("campaigns", () => { loadContacts(); onChange(); });
    return () => es.close();
  }, [loadContacts, onChange]);

  async function startDispatch() {
    setCreating(true);
    try {
      const r = await fetch("/api/campaigns/from-reuniao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuniaoId: reuniao.id, mode }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`Disparo iniciado com ${d.addedContacts} contato(s)`);
      onCampaignCreated();
    } finally { setCreating(false); }
  }

  async function saveTemplate() {
    if (!campaign?.id) return;
    setSavingTpl(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageTemplate: template }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Mensagem salva");
      onChange();
    } finally { setSavingTpl(false); }
  }

  function insertVar(key: string) {
    const placeholder = `{{${key}}}`;
    const ta = taRef.current;
    if (!ta) { setTemplate(prev => prev + placeholder); return; }
    const start = ta.selectionStart ?? template.length;
    const end   = ta.selectionEnd ?? template.length;
    const next = template.slice(0, start) + placeholder + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + placeholder.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/variable");
    if (!key) return;
    insertVar(key);
  }

  async function patchContact(ccId: string, data: any) {
    if (!campaign?.id) return;
    await fetch(`/api/campaigns/${campaign.id}/contacts/${ccId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadContacts();
  }

  async function deleteContact(ccId: string) {
    if (!campaign?.id) return;
    if (!confirm("Remover este contato deste disparo?")) return;
    await fetch(`/api/campaigns/${campaign.id}/contacts/${ccId}`, { method: "DELETE" });
    loadContacts();
  }

  // Empty state — disparo ainda não criado para esse modo
  if (!campaign) {
    const total =
      mode === "anfitrioes" ? (reuniao.anfitrioes?.length ?? 0)
      : mode === "presentes"  ? Math.max(0, (reuniao._count?.presentes ?? 0) - (reuniao.anfitrioes?.length ?? 0))
      :                         (reuniao._count?.presentes ?? 0);
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
          <Send size={20} className="text-brand-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Disparo ainda não iniciado</h3>
        <p className="text-sm text-gray-500 mb-4">{total} contato(s) disponíveis para esta categoria.</p>
        <button onClick={startDispatch} disabled={creating || total === 0}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={14} /> {creating ? "Criando..." : "Iniciar disparo"}
        </button>
      </div>
    );
  }

  const counts = useCounts(contacts);
  const pendentes = counts.PENDENTE;
  const processados = (counts.ENVIADO ?? 0) + (counts.RESPONDEU ?? 0) + (counts.IGNOROU ?? 0) + (counts.FALHOU ?? 0);
  const sorted = useMemo(() => [...contacts].sort((a, b) => {
    if (a.status === "PENDENTE" && b.status !== "PENDENTE") return -1;
    if (a.status !== "PENDENTE" && b.status === "PENDENTE") return 1;
    return new Date(b.sentAt ?? b.addedAt).getTime() - new Date(a.sentAt ?? a.addedAt).getTime();
  }), [contacts]);

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">

      {/* Editor de mensagem */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Mensagem padrão</h3>
          <button onClick={saveTemplate} disabled={savingTpl || template === campaign.messageTemplate}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium">
            <Save size={12} /> {savingTpl ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <div className="mb-2">
          <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">Campos personalizados — arraste ou clique</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button key={v.key} type="button"
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/variable", v.key); e.dataTransfer.effectAllowed = "copy"; }}
                onClick={() => insertVar(v.key)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-700 hover:bg-indigo-100 cursor-grab active:cursor-grabbing select-none">
                <span className="font-mono">{`{{${v.key}}}`}</span>
                <span className="text-[10px] text-indigo-400">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea ref={taRef} rows={5} value={template} onChange={e => setTemplate(e.target.value)}
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          placeholder="Oi {{primeiroNome}}, ..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[11px] text-amber-700 mt-2 flex items-start gap-1.5">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>Se um contato não tiver valor para alguma variável usada, a mensagem dele <strong>não será enviada</strong> — fica como ignorada.</span>
        </div>
      </section>

      {/* Resumo + ação de lote */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-center px-3 py-1.5 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-700 leading-none">{pendentes}</p>
              <p className="text-[10px] text-gray-500 uppercase mt-0.5">pendentes</p>
            </div>
            <div className="text-center px-3 py-1.5 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-700 leading-none">{counts.ENVIADO ?? 0}</p>
              <p className="text-[10px] text-blue-600 uppercase mt-0.5">enviados</p>
            </div>
            <div className="text-center px-3 py-1.5 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-700 leading-none">{counts.RESPONDEU ?? 0}</p>
              <p className="text-[10px] text-green-600 uppercase mt-0.5">resp.</p>
            </div>
            {(counts.FALHOU ?? 0) > 0 && (
              <div className="text-center px-3 py-1.5 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-700 leading-none">{counts.FALHOU}</p>
                <p className="text-[10px] text-red-600 uppercase mt-0.5">falharam</p>
              </div>
            )}
          </div>
          {pendentes > 0 && (
            <button onClick={() => setBatchOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Send size={14} /> Enviar em lote
            </button>
          )}
        </div>
      </section>

      {/* Lista de contatos */}
      <section className="bg-white border border-gray-200 rounded-xl">
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Nenhum contato neste disparo</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {contactsTotal > contacts.length && (
              <p className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50">Mostrando {contacts.length} de {contactsTotal} — use os filtros futuros pra ver mais</p>
            )}
            {sorted.map(cc => (
              <ContactRow key={cc.id} cc={cc} campaign={campaign} tags={campaign.responseTags ?? []}
                onSend={setSendCc} onPatch={patchContact} onDelete={deleteContact} />
            ))}
          </div>
        )}
      </section>

      {batchOpen && <BatchModal campaign={campaign} totalPendentes={pendentes} onClose={() => setBatchOpen(false)} onStarted={() => { loadContacts(); onChange(); }} />}
      {sendCc && <SendOneModal cc={sendCc} campaign={campaign} onClose={() => setSendCc(null)} onSent={() => { loadContacts(); onChange(); }} />}
    </div>
  );
}

function useCounts(contacts: any[]): Record<string, number> {
  return useMemo(() => {
    const c: Record<string, number> = {};
    for (const cc of contacts) c[cc.status] = (c[cc.status] ?? 0) + 1;
    return c;
  }, [contacts]);
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function ReuniaoDispatchPage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;
  const [reuniao, setReuniao] = useState<any | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeMode, setActiveMode] = useState<Mode>("anfitrioes");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([
      fetch(`/api/reunioes/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/campaigns?reuniaoOriginId=${id}`).then(r => r.ok ? r.json() : []),
    ]);
    setReuniao(r);
    setCampaigns(c);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Garante que o detail completo da campaign atual (com responseTags) esteja carregado
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const activeCampaignFromList = useMemo(
    () => campaigns.find(c => c.reuniaoMode === activeMode) ?? null,
    [campaigns, activeMode]
  );
  useEffect(() => {
    if (!activeCampaignFromList) { setActiveCampaign(null); return; }
    fetch(`/api/campaigns/${activeCampaignFromList.id}`)
      .then(r => r.json())
      .then(setActiveCampaign);
  }, [activeCampaignFromList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  if (!reuniao) return <div className="flex items-center justify-center h-screen text-gray-400">Reunião não encontrada</div>;

  const totAnf = reuniao.anfitrioes?.length ?? 0;
  const totPres = reuniao._count?.presentes ?? 0;
  const totSemAnf = Math.max(0, totPres - totAnf);

  const totalsByMode: Record<Mode, number> = {
    anfitrioes: totAnf,
    presentes:  totSemAnf,
    all:        totPres,
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <Link href="/campanhas/reunioes" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase font-semibold text-gray-400">Disparos da Reunião</p>
            <h1 className="text-xl font-bold text-gray-900 truncate">{reuniao.titulo}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mt-0.5">
              <span className="flex items-center gap-1"><Calendar size={11} />{format(new Date(reuniao.dataHora), "dd MMM yyyy", { locale: ptBR })}</span>
              {reuniao.local && <span className="flex items-center gap-1"><MapPin size={11} />{reuniao.local}</span>}
              <span className="flex items-center gap-1"><Users size={11} />{totPres} presentes · {totAnf} anfitriões</span>
              {reuniao.lider && <span>Líder: {reuniao.lider.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-1 px-6">
          {MODES.map(m => {
            const Icon = m.icon;
            const active = activeMode === m.key;
            const camp = campaigns.find(c => c.reuniaoMode === m.key);
            return (
              <button key={m.key} onClick={() => setActiveMode(m.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon size={14} /> {m.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>{totalsByMode[m.key]}</span>
                {camp && <span className="text-[10px] text-emerald-600">●</span>}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <ModeTab
          key={activeMode}
          reuniao={reuniao}
          mode={activeMode}
          campaign={activeCampaign}
          onCampaignCreated={load}
          onChange={load}
        />
      </div>
    </div>
  );
}
