"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, X, UserPlus, RefreshCw,
  CheckCheck, Paperclip, Link2, FileText, Mic,
  MessageSquarePlus, Archive, ArchiveRestore,
} from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { LabelManager, getLabelStyle, type LabelDef } from "@/components/ui/LabelManager";
import { NewConversationModal } from "@/components/ui/NewConversationModal";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────

function msgTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM", { locale: ptBR });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ contact, size = 40 }: { contact: any; size?: number }) {
  const [err, setErr] = useState(false);
  const photo   = contact?.profilePhotoUrl;
  const initial = (contact?.name?.[0] ?? "?").toUpperCase();
  const s = { width: size, height: size, minWidth: size, minHeight: size };
  if (photo && !err) {
    return <img src={photo} alt="" style={s} className="rounded-full object-cover shrink-0" onError={() => setErr(true)} />;
  }
  return (
    <div style={s} className="rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 shrink-0 text-sm select-none">
      {initial}
    </div>
  );
}

// ── Novo Contato ──────────────────────────────────────────────────────────────

function NewContactModal({ phone, name, onSave, onClose }: any) {
  const [form, setForm]   = useState({ name: name || "", phone: phone || "" });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, source: "message" }) });
      if (!r.ok) { toast.error((await r.json()).error); return; }
      toast.success("Contato salvo!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Salvar contato</h3>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input required value={form.name} onChange={f("name")} placeholder="Nome *" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input required value={form.phone} onChange={f("phone")} placeholder="Telefone *" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Attach Modal ──────────────────────────────────────────────────────────────

interface SendPayload {
  base64?: string; mimeType?: string; fileName?: string;
  linkUrl?: string; linkTitle?: string; linkDescription?: string;
  caption?: string;
}

function AttachModal({ onSend, onClose }: { onSend: (p: SendPayload) => void; onClose: () => void }) {
  const [tab, setTab]     = useState<"file" | "link">("file");
  const [file, setFile]   = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [link, setLink]   = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDesc, setLinkDesc]   = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function send() {
    if (loading) return;
    setLoading(true);
    try {
      if (tab === "link") {
        if (!link.trim()) return;
        onSend({ linkUrl: link.trim(), linkTitle: linkTitle.trim() || undefined, linkDescription: linkDesc.trim() || undefined });
      } else {
        if (!file) return;
        const base64 = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
        onSend({ base64, mimeType: file.type, fileName: file.name, caption: caption.trim() || undefined });
      }
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900 text-sm">Anexar</span>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={15} /></button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {([["file", "Arquivo", Paperclip], ["link", "Link / Preview", Link2]] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all ${tab === t ? "bg-white shadow text-indigo-700" : "text-gray-500"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        {tab === "file" ? (
          <div className="flex flex-col gap-3">
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              {file ? (
                <>
                  {preview ? <img src={preview} className="max-h-28 rounded-lg object-contain" alt="" /> : <FileText size={32} className="text-gray-300" />}
                  <p className="text-xs font-medium text-gray-700 truncate max-w-full text-center">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </>
              ) : (
                <>
                  <Paperclip size={24} className="text-gray-300" />
                  <p className="text-sm text-gray-400">Selecionar arquivo</p>
                  <p className="text-xs text-gray-300">Imagem, vídeo, PDF, áudio…</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar" onChange={onFileChange} />
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda (opcional)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="URL *" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Título (opcional)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input value={linkDesc} onChange={e => setLinkDesc(e.target.value)} placeholder="Descrição (opcional)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={send} disabled={loading || (tab === "file" ? !file : !link.trim())} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-1.5">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bolha de mídia ────────────────────────────────────────────────────────────

function MediaBubble({ messageId, mediaType }: { messageId: string; mediaType: string }) {
  const [src, setSrc]   = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function load() {
    setState("loading");
    try {
      const r = await fetch(`/api/messages/${messageId}/media`);
      if (!r.ok) throw new Error();
      setSrc(URL.createObjectURL(await r.blob()));
      setState("ready");
    } catch { setState("error"); }
  }

  if (state === "error") return <p className="text-xs text-red-400 py-1">Mídia indisponível</p>;

  if (mediaType === "image") {
    if (state !== "ready") return (
      <button onClick={load} disabled={state === "loading"} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors w-full justify-center">
        {state === "loading" ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span className="text-base">🖼</span>}
        <span>{state === "loading" ? "Carregando…" : "Ver imagem"}</span>
      </button>
    );
    return <img src={src!} className="rounded-xl max-w-full max-h-52 object-contain cursor-pointer" onClick={() => window.open(src!, "_blank")} alt="" />;
  }
  if (mediaType === "video") {
    if (state !== "ready") return (
      <button onClick={load} disabled={state === "loading"} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors w-full justify-center">
        {state === "loading" ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span className="text-base">🎬</span>}
        <span>{state === "loading" ? "Carregando…" : "Ver vídeo"}</span>
      </button>
    );
    return <video src={src!} controls className="rounded-xl max-w-full max-h-52" />;
  }
  if (mediaType === "audio") {
    if (state !== "ready") return (
      <button onClick={load} disabled={state === "loading"} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors w-full">
        {state === "loading" ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Mic size={14} className="shrink-0" />}
        <span>{state === "loading" ? "Carregando…" : "Ouvir áudio"}</span>
      </button>
    );
    return <audio src={src!} controls className="w-full max-w-xs" />;
  }
  if (mediaType === "document") {
    if (state !== "ready") return (
      <button onClick={load} disabled={state === "loading"} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors w-full">
        {state === "loading" ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <FileText size={14} className="shrink-0 text-gray-400" />}
        <span>{state === "loading" ? "Carregando…" : "Baixar arquivo"}</span>
      </button>
    );
    return <a href={src!} download className="flex items-center gap-2 text-xs text-indigo-600 hover:underline"><FileText size={14} /> Baixar arquivo</a>;
  }
  return null;
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected]   = useState<any | null>(null);
  const [messages, setMessages]   = useState<any[]>([]);
  const [text, setText]           = useState("");
  const [search, setSearch]       = useState("");
  const [sending, setSending]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newContact, setNewContact] = useState<any | null>(null);
  const [attachModal, setAttachModal]   = useState(false);
  const [newConvModal, setNewConvModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [labelDefs, setLabelDefs] = useState<LabelDef[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/labels").then(r => r.json()).then(setLabelDefs);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      if (showArchived) {
        const r = await fetch("/api/conversations?closed=true");
        const data = await r.json();
        setConversations(data);
      } else {
        const r = await fetch("/api/kanban");
        const cols = await r.json();
        const all = cols.flatMap((c: any) => c.conversations.map((conv: any) => ({ ...conv, statusName: c.name, statusColor: c.color })));
        all.sort((a: any, b: any) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
        setConversations(all);
      }
    } catch {}
  }, [showArchived]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const r = await fetch(`/api/conversations/${convId}`);
      const d = await r.json();
      const msgs: any[] = d.messages ?? [];
      const unique = Array.from(new Map(msgs.map((m: any) => [m.id, m])).values());
      setMessages(unique);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch {}
  }, []);

  const loadPhoto = useCallback(async (contact: any) => {
    if (!contact?.id || contact?.profilePhotoUrl) return;
    try {
      const r = await fetch(`/api/contacts/${contact.id}/photo`, { method: "POST" });
      const d = await r.json();
      if (d.url) {
        setConversations(prev => prev.map(c => c.contactId === contact.id ? { ...c, contact: { ...c.contact, profilePhotoUrl: d.url } } : c));
        setSelected((s: any) => s?.contactId === contact.id ? { ...s, contact: { ...s.contact, profilePhotoUrl: d.url } } : s);
      }
    } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId || showArchived) return;
    loadMessages(selectedId);
    const interval = setInterval(() => loadMessages(selectedId), 6000);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages, showArchived]);

  useEffect(() => {
    if (selectedId && showArchived) loadMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (selected?.contact) loadPhoto(selected.contact);
  }, [selected?.contactId]);

  async function sendMsg(payload: any) {
    if (!selected || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { toast.error("Erro ao enviar"); return; }
      const msg = await r.json();
      setMessages(prev => {
        const exists = prev.some(m => m.id === msg.id);
        return exists ? prev : [...prev, msg];
      });
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      loadConversations();
    } finally { setSending(false); }
  }

  async function closeConversation() {
    if (!selected) return;
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close: true }),
    });
    toast.success("Conversa fechada");
    setConversations(prev => prev.filter(c => c.id !== selected.id));
    setSelected(null);
    setMessages([]);
  }

  async function reopenConversation() {
    if (!selected) return;
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close: false }),
    });
    toast.success("Conversa reaberta");
    setConversations(prev => prev.filter(c => c.id !== selected.id));
    setSelected(null);
    setMessages([]);
  }

  async function handleAttach(p: SendPayload) {
    if (p.linkUrl) await sendMsg({ linkUrl: p.linkUrl, linkTitle: p.linkTitle, linkDescription: p.linkDescription });
    else if (p.base64) await sendMsg({ base64: p.base64, mimeType: p.mimeType, fileName: p.fileName, message: p.caption });
  }

  function updateLabels(contactId: string, labels: string[]) {
    setConversations(prev => prev.map(c => c.contactId === contactId ? { ...c, contact: { ...c.contact, labels } } : c));
    setSelected((s: any) => s?.contactId === contactId ? { ...s, contact: { ...s.contact, labels } } : s);
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || c.contact?.name?.toLowerCase().includes(q) || c.contact?.phone?.includes(q);
  });

  const isUnknown = selected && (!selected.contact?.name || selected.contact?.name === selected.contact?.phone);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="w-72 flex flex-col border-r border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <span className="font-semibold text-gray-900">
            {showArchived ? "Arquivadas" : "Conversas"}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowArchived(v => !v); setSelected(null); setMessages([]); }}
              title={showArchived ? "Ver abertas" : "Ver arquivadas"}
              className={`p-1.5 rounded-lg transition-colors ${showArchived ? "bg-amber-50 text-amber-600" : "hover:bg-gray-100 text-gray-400"}`}>
              {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            </button>
            <button onClick={() => setNewConvModal(true)} title="Nova conversa"
              className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded-lg transition-colors">
              <MessageSquarePlus size={14} />
            </button>
            <button onClick={async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); }}
              className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 ${refreshing ? "animate-spin" : ""}`}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-xs space-y-1">
              <p className="font-medium text-sm">{showArchived ? "Nenhuma conversa arquivada" : "Nenhuma conversa"}</p>
              {!showArchived && <p>Configure o webhook na Evolution API</p>}
            </div>
          )}
          {filtered.map(conv => {
            const active  = selected?.id === conv.id;
            const labels: string[] = conv.contact?.labels ?? [];
            return (
              <div key={conv.id} onClick={() => setSelected(conv)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 ${active ? "bg-indigo-50 border-l-[3px] border-l-indigo-500" : ""}`}>
                <Avatar contact={conv.contact} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{conv.contact?.name || conv.contact?.phone}</p>
                    <span className="text-[11px] text-gray-400 shrink-0">{conv.lastMessageAt ? msgTime(conv.lastMessageAt) : ""}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessageText || "—"}</p>
                  {labels.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {labels.slice(0, 2).map(l => {
                        const s = getLabelStyle(l, labelDefs);
                        return <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full leading-none font-medium" style={{ backgroundColor: s.bgColor, color: s.color }}>{l}</span>;
                      })}
                      {labels.length > 2 && <span className="text-[10px] text-gray-400">+{labels.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Chat ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Send size={22} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-600">Selecione uma conversa</p>
          <p className="text-sm mt-1">Mensagens do WhatsApp aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100">
            <Avatar contact={selected.contact} size={38} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm truncate">{selected.contact?.name || selected.contact?.phone}</p>
                {selected.contact?.role && <RoleBadge role={selected.contact.role} />}
              </div>
              <p className="text-xs text-gray-400">{selected.contact?.phone}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isUnknown && (
                <button onClick={() => setNewContact(selected.contact)}
                  className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium">
                  <UserPlus size={12} /> Salvar
                </button>
              )}
              <LabelManager
                contactId={selected.contactId}
                labels={selected.contact?.labels ?? []}
                onUpdate={(labels: string[]) => updateLabels(selected.contactId, labels)}
                labelDefs={labelDefs}
                onDefsChange={setLabelDefs}
              />
              {showArchived ? (
                <button onClick={reopenConversation}
                  className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium">
                  <ArchiveRestore size={12} /> Reabrir
                </button>
              ) : (
                <button onClick={closeConversation}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Archive size={12} /> Fechar
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 bg-[#f0f2f5]">
            {showArchived && (
              <div className="flex justify-center mb-3">
                <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-3 py-1">
                  Conversa arquivada
                </span>
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma mensagem</div>
            )}
            {messages.map((msg, i) => {
              const prev    = messages[i - 1];
              const day     = format(new Date(msg.sentAt), "dd/MM/yyyy");
              const prevDay = prev ? format(new Date(prev.sentAt), "dd/MM/yyyy") : null;
              const isOut   = msg.direction === "OUT";
              return (
                <div key={msg.id}>
                  {day !== prevDay && (
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] bg-white rounded-full px-3 py-1 text-gray-500 shadow-sm border border-gray-100">
                        {isToday(new Date(msg.sentAt)) ? "Hoje" : isYesterday(new Date(msg.sentAt)) ? "Ontem" : format(new Date(msg.sentAt), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[68%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isOut ? "bg-[#d9fdd3] rounded-br-sm" : "bg-white rounded-bl-sm border border-gray-100"}`}>
                      {msg.mediaType && !isOut && <div className="mb-1.5"><MediaBubble messageId={msg.id} mediaType={msg.mediaType} /></div>}
                      {msg.content && <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words text-sm">{msg.content}</p>}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[11px] text-gray-400">{format(new Date(msg.sentAt), "HH:mm")}</span>
                        {isOut && <CheckCheck size={11} className="text-blue-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input — desabilitado em arquivadas */}
          {!showArchived && (
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
              <button onClick={() => setAttachModal(true)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                <Paperclip size={18} />
              </button>
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); sendMsg({ message: text }); } }}
                placeholder="Mensagem"
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all" />
              <button onClick={() => { if (text.trim()) sendMsg({ message: text }); }} disabled={sending || !text.trim()}
                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
                <Send size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {attachModal && <AttachModal onSend={p => { handleAttach(p); }} onClose={() => setAttachModal(false)} />}
      {newContact && <NewContactModal phone={newContact.phone} name={newContact.name} onSave={() => { setNewContact(null); loadConversations(); }} onClose={() => setNewContact(null)} />}
      {newConvModal && <NewConversationModal onClose={() => setNewConvModal(false)} onCreated={conv => { loadConversations(); setSelected(conv); }} />}
    </div>
  );
}
