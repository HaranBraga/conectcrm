"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Settings, Users, Clock, CheckCheck, Plus, Trash2,
  Search, X, Image as ImageIcon, Video, Link2, MessageSquare, Tag, Save,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePreview(template: string, contact: any, lider?: string): string {
  const first = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : "");
  const map: Record<string, string> = {
    nome: contact?.name ?? "",
    primeiroNome: first(contact?.name),
    telefone: contact?.phone ?? "",
    lider: lider ?? contact?.parent?.name ?? "",
    primeiroLider: first(lider ?? contact?.parent?.name),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}

// ─── ContactSearch ───────────────────────────────────────────────────────────

function ContactSearch({ onSelect, placeholder = "Buscar contato..." }: { onSelect: (c: any) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function search(v: string) {
    setQ(v); clearTimeout(timer.current);
    if (!v.trim()) { setRes([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(v)}&limit=8`);
      const d = await r.json();
      setRes(d.contacts ?? []); setOpen(true);
    }, 280);
  }

  return (
    <div className="relative" ref={ref}>
      <input value={q} onChange={e => search(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {open && res.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-50">
          {res.map(c => (
            <div key={c.id} onClick={() => { onSelect(c); setQ(""); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Adicionar contatos ──────────────────────────────────────────────────────

function AddContactsModal({ campaignId, onClose, onAdded }: any) {
  const [origem, setOrigem] = useState<"manual" | "grupo" | "reuniao">("manual");
  const [groups, setGroups] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [reuniaoId, setReuniaoId] = useState("");
  const [reuniaoMode, setReuniaoMode] = useState<"all" | "anfitrioes" | "presentes">("all");
  const [picked, setPicked] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/groups").then(r => r.json()).then(setGroups);
    fetch("/api/reunioes").then(r => r.json()).then(setReunioes);
  }, []);

  async function add() {
    setSaving(true);
    try {
      const body: any = {};
      if (origem === "manual") body.contactIds = picked.map(p => p.id);
      else if (origem === "grupo")  body.groupId = groupId;
      else                          { body.reuniaoId = reuniaoId; body.mode = reuniaoMode; }

      const r = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`${d.added} adicionados${d.skipped ? ` · ${d.skipped} já estavam` : ""}`);
      onAdded(); onClose();
    } finally { setSaving(false); }
  }

  const canAdd = origem === "manual" ? picked.length > 0 : origem === "grupo" ? !!groupId : !!reuniaoId;

  return (
    <Modal open title="Adicionar contatos à campanha" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5">
          {(["manual", "grupo", "reuniao"] as const).map(m => (
            <button key={m} type="button" onClick={() => setOrigem(m)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${origem === m ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {m === "manual" ? "Manual" : m === "grupo" ? "Por Grupo" : "Por Reunião"}
            </button>
          ))}
        </div>

        {origem === "manual" && (
          <>
            <ContactSearch onSelect={(c) => {
              if (picked.find(p => p.id === c.id)) return;
              setPicked(prev => [...prev, c]);
            }} placeholder="Buscar e adicionar contatos..." />
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {picked.map(c => (
                  <div key={c.id} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
                    <span className="text-xs text-indigo-900">{c.name}</span>
                    <button type="button" onClick={() => setPicked(prev => prev.filter(p => p.id !== c.id))}
                      className="text-indigo-300 hover:text-red-400"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {origem === "grupo" && (
          <select value={groupId} onChange={e => setGroupId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione um grupo...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g._count?.members ?? 0})</option>)}
          </select>
        )}

        {origem === "reuniao" && (
          <>
            <select value={reuniaoId} onChange={e => setReuniaoId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione uma reunião...</option>
              {reunioes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.titulo} — {format(new Date(r.dataHora), "dd/MM/yyyy", { locale: ptBR })}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: "all", label: "Todos os presentes" },
                { key: "anfitrioes", label: "Apenas anfitriões" },
                { key: "presentes", label: "Presentes (sem anfitriões)" },
              ] as const).map(opt => (
                <button key={opt.key} type="button" onClick={() => setReuniaoMode(opt.key)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${reuniaoMode === opt.key ? "bg-indigo-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-gray-400">Contatos que já estão na campanha serão ignorados automaticamente.</p>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={add} disabled={!canAdd || saving}
            className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de envio individual ────────────────────────────────────────────────

function SendModal({ cc, campaign, onClose, onSent }: any) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    setMsg(resolvePreview(campaign.messageTemplate, cc.contact, cc.assignedTo?.name));
  }, [cc, campaign]);

  async function send() {
    setSending(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/contacts/${cc.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideMessage: msg }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro ao enviar"); return; }
      toast.success("Mensagem enviada!");
      onSent(); onClose();
    } finally { setSending(false); }
  }

  return (
    <Modal open title={`Enviar para ${cc.contact.name}`} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p><strong>Telefone:</strong> {cc.contact.phone}</p>
          {(cc.assignedTo?.name || cc.contact.parent?.name) && (
            <p><strong>Líder:</strong> {cc.assignedTo?.name ?? cc.contact.parent?.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (já personalizada)</label>
          <textarea rows={6} value={msg} onChange={e => setMsg(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        {campaign.mediaUrl && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {campaign.mediaType === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
            Mídia anexada será enviada junto
          </div>
        )}
        {campaign.linkUrl && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Link2 size={14} /> Link: {campaign.linkUrl}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={send} disabled={sending || !msg.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <Send size={14} /> {sending ? "Enviando..." : "Enviar agora"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Configuração ────────────────────────────────────────────────────────────

function ConfigTab({ campaign, onSaved }: any) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [goal, setGoal] = useState(campaign.goal ?? "");
  const [status, setStatus] = useState(campaign.status);
  const [messageTemplate, setMessageTemplate] = useState(campaign.messageTemplate);
  const [mediaUrl, setMediaUrl] = useState<string | null>(campaign.mediaUrl);
  const [mediaType, setMediaType] = useState<string | null>(campaign.mediaType);
  const [linkUrl, setLinkUrl] = useState(campaign.linkUrl ?? "");
  const [tags, setTags] = useState(campaign.responseTags ?? []);
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadMedia(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/campaigns/upload", { method: "POST", body: fd });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      setMediaUrl(d.url); setMediaType(d.type);
      toast.success("Mídia carregada");
    } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, goal, status, messageTemplate, mediaUrl, mediaType, linkUrl: linkUrl || null }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Salvo");
      onSaved();
    } finally { setSaving(false); }
  }

  async function addTag() {
    if (!newTag.trim()) return;
    const r = await fetch(`/api/campaigns/${campaign.id}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newTag }),
    });
    if (!r.ok) { toast.error("Erro"); return; }
    setTags((prev: any[]) => [...prev, await r.json()]);
    setNewTag("");
  }

  async function delTag(id: string) {
    await fetch(`/api/campaigns/${campaign.id}/tags/${id}`, { method: "DELETE" });
    setTags((prev: any[]) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Informações</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Objetivo"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
        <div className="flex gap-1.5">
          {(["ATIVA", "PAUSADA", "CONCLUIDA"] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${status === s ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {s === "ATIVA" ? "Ativa" : s === "PAUSADA" ? "Pausada" : "Concluída"}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Mensagem padrão</h3>
        <textarea rows={6} value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-none" />
        <p className="text-xs text-gray-400">
          Variáveis: <code>{"{{nome}}"}</code> · <code>{"{{primeiroNome}}"}</code> · <code>{"{{telefone}}"}</code> · <code>{"{{lider}}"}</code> · <code>{"{{primeiroLider}}"}</code>
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><ImageIcon size={14} /> Mídia (opcional)</h3>
        {mediaUrl ? (
          <div className="flex items-center gap-3">
            {mediaType === "video"
              ? <video src={mediaUrl} className="w-32 h-32 rounded-lg object-cover" controls />
              : <img src={mediaUrl} alt="" className="w-32 h-32 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="text-xs text-gray-500 truncate">{mediaUrl}</p>
              <button onClick={() => { setMediaUrl(null); setMediaType(null); }}
                className="text-xs text-red-500 hover:underline mt-2">Remover</button>
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer text-sm text-gray-500 hover:bg-gray-50">
            <input type="file" accept="image/*,video/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
            {uploading ? "Enviando..." : "Clique para carregar imagem ou vídeo (até 25MB)"}
          </label>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Link com prévia (opcional)</label>
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://instagram.com/..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Tag size={14} /> Tags de resposta</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((t: any) => (
            <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ color: t.color, backgroundColor: t.bgColor, borderColor: t.color + "40" }}>
              {t.label}
              <button onClick={() => delTag(t.id)} className="opacity-50 hover:opacity-100"><X size={11} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Nova tag..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={addTag} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} />
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          <Save size={14} /> {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
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
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ color: cc.contact.role.color, backgroundColor: cc.contact.role.bgColor }}>
              {cc.contact.role.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          <span>{cc.contact.phone}</span>
          {(cc.assignedTo?.name || cc.contact.parent?.name) && (
            <span>Líder: {cc.assignedTo?.name ?? cc.contact.parent?.name}</span>
          )}
          {cc.sentAt && <span>Enviado {format(new Date(cc.sentAt), "dd/MM HH:mm")}</span>}
        </div>
      </div>

      {tag && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ color: tag.color, backgroundColor: tag.bgColor }}>{tag.label}</span>
      )}

      {cc.status === "PENDENTE" && (
        <button onClick={() => onSend(cc)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium shrink-0">
          <Send size={12} /> Enviar
        </button>
      )}

      {cc.status !== "PENDENTE" && tags.length > 0 && (
        <div className="relative" ref={tagRef}>
          <button onClick={() => setShowTags(s => !s)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs shrink-0">
            <Tag size={11} /> {tag ? "Mudar tag" : "Etiquetar"}
          </button>
          {showTags && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56 max-h-60 overflow-y-auto">
              {tags.map((t: any) => (
                <button key={t.id} onClick={() => { onPatch(cc.id, { responseTagId: t.id, status: "RESPONDEU" }); setShowTags(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>{t.label}</span>
                </button>
              ))}
              {tag && (
                <button onClick={() => { onPatch(cc.id, { responseTagId: null }); setShowTags(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left text-red-500 border-t border-gray-100 mt-1 pt-1.5">
                  <X size={11} /> Remover tag
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => router.push(`/conversas?contactId=${cc.contactId}`)}
        title="Abrir conversa" className="p-1.5 text-gray-400 hover:text-brand-600 shrink-0">
        <MessageSquare size={14} />
      </button>
      <button onClick={() => onDelete(cc.id)} title="Remover da campanha"
        className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function CampanhaDetailPage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;
  const [campaign, setCampaign] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tab, setTab] = useState<"PENDENTE" | "ENVIADO" | "CONFIG">("PENDENTE");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [sendCc, setSendCc] = useState<any | null>(null);

  const loadCampaign = useCallback(async () => {
    const r = await fetch(`/api/campaigns/${id}`);
    if (r.ok) setCampaign(await r.json());
  }, [id]);

  const loadContacts = useCallback(async () => {
    const r = await fetch(`/api/campaigns/${id}/contacts`);
    setContacts(await r.json());
  }, [id]);

  useEffect(() => { loadCampaign(); loadContacts(); }, [loadCampaign, loadContacts]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("campaigns", () => { loadCampaign(); loadContacts(); });
    return () => es.close();
  }, [loadCampaign, loadContacts]);

  async function patchContact(ccId: string, data: any) {
    await fetch(`/api/campaigns/${id}/contacts/${ccId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadContacts();
  }

  async function deleteContact(ccId: string) {
    if (!confirm("Remover este contato da campanha?")) return;
    await fetch(`/api/campaigns/${id}/contacts/${ccId}`, { method: "DELETE" });
    loadContacts();
  }

  const pendentes = useMemo(() => contacts.filter(c => c.status === "PENDENTE"), [contacts]);
  const processados = useMemo(() => contacts.filter(c => c.status !== "PENDENTE"), [contacts]);

  const filterFn = (cc: any) => !search.trim() ||
    cc.contact.name?.toLowerCase().includes(search.toLowerCase()) ||
    cc.contact.phone?.includes(search);

  if (!campaign) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <Link href="/campanhas" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h1>
            {campaign.goal && <p className="text-sm text-gray-500 truncate">{campaign.goal}</p>}
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Adicionar contatos
          </button>
        </div>
        <div className="flex gap-1 px-6">
          {[
            { key: "PENDENTE", label: "Pendentes",  icon: Clock,     count: campaign.counts?.PENDENTE ?? 0 },
            { key: "ENVIADO",  label: "Processados", icon: CheckCheck, count: (campaign.counts?.ENVIADO ?? 0) + (campaign.counts?.RESPONDEU ?? 0) + (campaign.counts?.IGNOROU ?? 0) },
            { key: "CONFIG",   label: "Configuração", icon: Settings, count: null },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon size={14} /> {t.label}
                {t.count !== null && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {tab !== "CONFIG" && (
        <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "PENDENTE" && (
          <div className="max-w-4xl mx-auto p-6">
            {pendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Users size={36} className="mb-3 opacity-30" />
                <p className="font-medium">Nenhum contato pendente</p>
                <p className="text-sm mt-1">Adicione contatos para começar a campanha</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {pendentes.filter(filterFn).map(cc => (
                  <ContactRow key={cc.id} cc={cc} campaign={campaign} tags={campaign.responseTags ?? []}
                    onSend={setSendCc} onPatch={patchContact} onDelete={deleteContact} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "ENVIADO" && (
          <div className="max-w-4xl mx-auto p-6">
            {processados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <CheckCheck size={36} className="mb-3 opacity-30" />
                <p className="font-medium">Ninguém foi processado ainda</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {processados.filter(filterFn).map(cc => (
                  <ContactRow key={cc.id} cc={cc} campaign={campaign} tags={campaign.responseTags ?? []}
                    onSend={setSendCc} onPatch={patchContact} onDelete={deleteContact} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "CONFIG" && (
          <div className="p-6">
            <ConfigTab campaign={campaign} onSaved={loadCampaign} />
          </div>
        )}
      </div>

      {addOpen && <AddContactsModal campaignId={id} onClose={() => setAddOpen(false)} onAdded={() => { loadContacts(); loadCampaign(); }} />}
      {sendCc && <SendModal cc={sendCc} campaign={campaign} onClose={() => setSendCc(null)} onSent={() => { loadContacts(); loadCampaign(); }} />}
    </div>
  );
}
