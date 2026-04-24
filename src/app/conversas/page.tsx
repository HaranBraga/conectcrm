"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, Tag, X, Plus, UserPlus, RefreshCw,
  CheckCheck, Paperclip, Image as ImageIcon, Video, FileText, Link2
} from "lucide-react";
import { RoleBadge, ROLE_LABELS, ROLE_ORDER } from "@/components/ui/RoleBadge";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────────────────────

const LABEL_COLORS = [
  { name: "Interessado",  color: "#10b981" },
  { name: "Sem retorno",  color: "#f59e0b" },
  { name: "Frio",         color: "#3b82f6" },
  { name: "VIP",          color: "#8b5cf6" },
  { name: "Urgente",      color: "#ef4444" },
  { name: "Reunião",      color: "#ec4899" },
];

function msgTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM", { locale: ptBR });
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ contact, size = 40 }: { contact: any; size?: number }) {
  const [err, setErr] = useState(false);
  const initial = (contact?.name?.[0] ?? "?").toUpperCase();
  const style = { width: size, height: size, minWidth: size };

  if (contact?.profilePhotoUrl && !err) {
    return (
      <img
        src={contact.profilePhotoUrl}
        alt={contact.name}
        style={style}
        className="rounded-full object-cover shrink-0"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold shrink-0 text-sm"
    >
      {initial}
    </div>
  );
}

// ── Etiquetas ──────────────────────────────────────────────────────────────

function LabelManager({ contact, onUpdate }: any) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const labels: string[] = contact?.labels ?? [];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function toggle(label: string) {
    const next = labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label];
    const r = await fetch(`/api/contacts/${contact.id}/labels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labels: next }) });
    if (r.ok) onUpdate(next);
  }

  async function addCustom() {
    if (!custom.trim()) return;
    const next = [...labels, custom.trim()];
    const r = await fetch(`/api/contacts/${contact.id}/labels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labels: next }) });
    if (r.ok) { onUpdate(next); setCustom(""); }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
        <Tag size={13} />
        {labels.length > 0 ? `${labels.length} etiqueta${labels.length > 1 ? "s" : ""}` : "Etiquetas"}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-60">
          <p className="text-xs font-semibold text-gray-500 mb-2">ETIQUETAS</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {LABEL_COLORS.map(({ name, color }) => (
              <button key={name} onClick={() => toggle(name)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${labels.includes(name) ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                style={labels.includes(name) ? { backgroundColor: color } : {}}
              >{name}</button>
            ))}
          </div>
          {labels.filter((l) => !LABEL_COLORS.find((lc) => lc.name === l)).map((l) => (
            <div key={l} className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 mb-1 text-xs">
              <span className="flex-1 truncate">{l}</span>
              <button onClick={() => toggle(l)} className="text-gray-400 hover:text-red-500"><X size={10} /></button>
            </div>
          ))}
          <div className="flex gap-1.5 mt-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="Personalizada..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            <button onClick={addCustom} className="px-2 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-xs font-medium">+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Novo Contato ───────────────────────────────────────────────────────────

function NewContactModal({ phone, name, onSave, onClose }: any) {
  const [form, setForm] = useState({ name: name || "", phone: phone || "", role: "APOIADOR" });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, source: "message" }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Contato salvo!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Salvar Contato</h3>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input required value={form.name} onChange={f("name")} placeholder="Nome *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input required value={form.phone} onChange={f("phone")} placeholder="Telefone *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <select value={form.role} onChange={f("role")} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button disabled={saving} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Media Modal ────────────────────────────────────────────────────────────

type MediaType = "image" | "video" | "document" | "link";

const MEDIA_OPTIONS: { type: MediaType; label: string; icon: any; placeholder: string; accept?: string }[] = [
  { type: "image",    label: "Imagem",    icon: ImageIcon,  placeholder: "https://exemplo.com/foto.jpg" },
  { type: "video",    label: "Vídeo",     icon: Video,      placeholder: "https://exemplo.com/video.mp4" },
  { type: "document", label: "Arquivo",   icon: FileText,   placeholder: "https://exemplo.com/arquivo.pdf" },
  { type: "link",     label: "Link",      icon: Link2,      placeholder: "https://exemplo.com" },
];

function MediaModal({ onSend, onClose }: { onSend: (type: MediaType, url: string, caption?: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<MediaType>("image");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const opt = MEDIA_OPTIONS.find((o) => o.type === tab)!;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Enviar mídia</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {MEDIA_OPTIONS.map(({ type, label, icon: Icon }) => (
            <button key={type} onClick={() => setTab(type)} className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-medium transition-all ${tab === type ? "bg-white shadow text-brand-700" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL {opt.label}</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={opt.placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {tab !== "link" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Legenda (opcional)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Adicione uma legenda..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          )}
          {url && tab === "image" && (
            <img src={url} alt="preview" className="rounded-lg max-h-32 object-cover w-full" onError={() => {}} />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { if (url.trim()) { onSend(tab, url.trim(), caption.trim() || undefined); onClose(); } }} disabled={!url.trim()} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2">
            <Send size={14} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ConversasPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newContact, setNewContact] = useState<any | null>(null);
  const [mediaModal, setMediaModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/kanban");
    const cols = await r.json();
    const all = cols.flatMap((c: any) =>
      c.conversations.map((conv: any) => ({ ...conv, statusName: c.name, statusColor: c.color }))
    );
    all.sort((a: any, b: any) =>
      new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime()
    );
    setConversations(all);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    const r = await fetch(`/api/conversations/${convId}`);
    const d = await r.json();
    setMessages(d.messages ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, []);

  // Carrega foto de perfil se não tiver
  const loadPhoto = useCallback(async (contact: any) => {
    if (contact?.profilePhotoUrl || !contact?.id) return;
    try {
      const r = await fetch(`/api/contacts/${contact.id}/photo`, { method: "POST" });
      const d = await r.json();
      if (d.url) {
        setConversations((prev) =>
          prev.map((c) => c.contactId === contact.id ? { ...c, contact: { ...c.contact, profilePhotoUrl: d.url } } : c)
        );
        setSelected((s: any) => s ? { ...s, contact: { ...s.contact, profilePhotoUrl: d.url } } : s);
      }
    } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    loadPhoto(selected.contact);
    const interval = setInterval(() => loadMessages(selected.id), 5000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  async function refresh() {
    setRefreshing(true);
    await loadConversations();
    if (selected) await loadMessages(selected.id);
    setRefreshing(false);
  }

  async function sendMessage(payload: { message?: string; mediaUrl?: string; mediaType?: string; linkUrl?: string }) {
    if (!selected) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const msg = await r.json();
      setMessages((p) => [...p, msg]);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      loadConversations();
    } catch { toast.error("Erro ao enviar"); }
    finally { setSending(false); }
  }

  async function handleMediaSend(type: MediaType, url: string, caption?: string) {
    if (type === "link") {
      await sendMessage({ linkUrl: url });
    } else {
      await sendMessage({ mediaUrl: url, mediaType: type, message: caption });
    }
  }

  function updateLabels(contactId: string, labels: string[]) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, contact: { ...c.contact, labels } } : c));
    if (selected?.contactId === contactId) setSelected((s: any) => ({ ...s, contact: { ...s.contact, labels } }));
  }

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.contact?.name?.toLowerCase().includes(q) || c.contact?.phone?.includes(q);
  });

  const isUnknown = selected && (selected.contact?.name === selected.contact?.phone || !selected.contact?.name);

  return (
    <div className="flex h-screen">
      {/* ── Lista de conversas ───────────────────────────────── */}
      <aside className="w-80 flex flex-col border-r border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Conversas</h2>
          <button onClick={refresh} title="Atualizar" className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 ${refreshing ? "animate-spin" : ""}`}>
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 p-6 text-center">
              <p className="font-medium">Nenhuma conversa</p>
              <p className="text-xs">Configure o webhook na Evolution API para receber mensagens automaticamente</p>
              <code className="text-xs bg-gray-100 rounded-lg px-2 py-1 text-brand-600 break-all mt-1">/api/webhook</code>
            </div>
          )}
          {filtered.map((conv) => {
            const labels: string[] = conv.contact?.labels ?? [];
            const active = selected?.id === conv.id;
            return (
              <div key={conv.id} onClick={() => setSelected(conv)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${active ? "bg-brand-50 border-l-2 border-l-brand-600" : ""}`}
              >
                <Avatar contact={conv.contact} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{conv.contact?.name || conv.contact?.phone}</p>
                    <span className="text-xs text-gray-400 shrink-0">{conv.lastMessageAt ? msgTime(conv.lastMessageAt) : ""}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessageText || "Sem mensagens"}</p>
                  {labels.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {labels.slice(0, 2).map((l) => {
                        const cfg = LABEL_COLORS.find((lc) => lc.name === l);
                        return <span key={l} className="text-xs px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: cfg?.color ?? "#6b7280" }}>{l}</span>;
                      })}
                      {labels.length > 2 && <span className="text-xs text-gray-400">+{labels.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Área do chat ─────────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <Send size={28} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-600 text-lg">Selecione uma conversa</p>
          <p className="text-sm">As mensagens recebidas do WhatsApp aparecem aqui</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#f0f2f5]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
            <Avatar contact={selected.contact} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 truncate">{selected.contact?.name || selected.contact?.phone}</p>
                {selected.contact?.role && <RoleBadge role={selected.contact.role} />}
              </div>
              <p className="text-xs text-gray-500">{selected.contact?.phone}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isUnknown && (
                <button onClick={() => setNewContact(selected.contact)}
                  className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
                  <UserPlus size={13} /> Salvar
                </button>
              )}
              <LabelManager contact={selected.contact} onUpdate={(labels: string[]) => updateLabels(selected.contactId, labels)} />
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma mensagem</div>
            )}
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const thisDay = format(new Date(msg.sentAt), "dd/MM/yyyy");
              const prevDay = prev ? format(new Date(prev.sentAt), "dd/MM/yyyy") : null;
              const showDate = thisDay !== prevDay;
              const isOut = msg.direction === "OUT";
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-500 shadow-sm">
                        {isToday(new Date(msg.sentAt)) ? "Hoje" : isYesterday(new Date(msg.sentAt)) ? "Ontem" : format(new Date(msg.sentAt), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isOut ? "bg-[#d9fdd3] text-gray-800 rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm"}`}>
                      {msg.content.startsWith("🖼️") || msg.content.startsWith("🎥") ? (
                        <div>
                          {msg.content.startsWith("🖼️") && (
                            <p className="text-2xl mb-1">🖼️</p>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${isOut ? "text-gray-400" : "text-gray-400"}`}>
                        <span className="text-xs">{format(new Date(msg.sentAt), "HH:mm")}</span>
                        {isOut && <CheckCheck size={12} className="text-blue-500" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <button onClick={() => setMediaModal(true)} title="Enviar mídia"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors shrink-0">
              <Paperclip size={19} />
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMessage({ message: text }); } }}
              placeholder="Digite uma mensagem"
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
            />
            <button onClick={() => { if (text.trim()) sendMessage({ message: text }); }} disabled={sending || !text.trim()}
              className="w-9 h-9 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {mediaModal && <MediaModal onSend={handleMediaSend} onClose={() => setMediaModal(false)} />}
      {newContact && (
        <NewContactModal phone={newContact.phone} name={newContact.name}
          onSave={() => { setNewContact(null); loadConversations(); }}
          onClose={() => setNewContact(null)} />
      )}
    </div>
  );
}
