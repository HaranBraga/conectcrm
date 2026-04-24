"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, Phone, Tag, X, Plus, UserPlus, RefreshCw, Check, CheckCheck } from "lucide-react";
import { RoleBadge, ROLE_LABELS, ROLE_ORDER } from "@/components/ui/RoleBadge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const LABEL_COLORS = [
  { name: "Interessado",   color: "#10b981" },
  { name: "Sem retorno",   color: "#f59e0b" },
  { name: "Frio",          color: "#3b82f6" },
  { name: "VIP",           color: "#8b5cf6" },
  { name: "Urgente",       color: "#ef4444" },
  { name: "Reunião",       color: "#ec4899" },
];

function msgTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM", { locale: ptBR });
}

function NewContactModal({ phone, name, onSave, onClose }: any) {
  const [form, setForm] = useState({ name: name || "", phone: phone || "", role: "APOIADOR" });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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

function LabelManager({ contact, onUpdate }: any) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const labels: string[] = contact.labels ?? [];

  async function toggle(label: string) {
    const next = labels.includes(label) ? labels.filter((l: string) => l !== label) : [...labels, label];
    const r = await fetch(`/api/contacts/${contact.id}/labels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labels: next }) });
    if (r.ok) onUpdate(next);
  }

  async function addCustom() {
    if (!custom.trim()) return;
    const next = [...labels, custom.trim()];
    const r = await fetch(`/api/contacts/${contact.id}/labels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labels: next }) });
    if (r.ok) { onUpdate(next); setCustom(""); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors px-2 py-1 rounded-lg hover:bg-brand-50">
        <Tag size={13} /> Etiquetas
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {LABEL_COLORS.map(({ name, color }) => (
          <button key={name} onClick={() => toggle(name)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${labels.includes(name) ? "border-transparent text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"}`} style={labels.includes(name) ? { backgroundColor: color } : {}}>
            {labels.includes(name) && <Check size={10} />} {name}
          </button>
        ))}
      </div>
      {labels.filter((l: string) => !LABEL_COLORS.find((lc) => lc.name === l)).map((l: string) => (
        <div key={l} className="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-1 mb-1">
          <span className="flex-1">{l}</span>
          <button onClick={() => toggle(l)}><X size={10} /></button>
        </div>
      ))}
      <div className="flex gap-1 mt-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="Etiqueta personalizada" className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        <button onClick={addCustom} className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700"><Plus size={12} /></button>
      </div>
      <button onClick={() => setOpen(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center">Fechar</button>
    </div>
  );
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newContact, setNewContact] = useState<any | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/kanban");
    const cols = await r.json();
    const all = cols.flatMap((c: any) => c.conversations.map((conv: any) => ({ ...conv, statusName: c.name, statusColor: c.color })));
    all.sort((a: any, b: any) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
    setConversations(all);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    const r = await fetch(`/api/conversations/${convId}`);
    const d = await r.json();
    setMessages(d.messages ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    const interval = setInterval(() => loadMessages(selected.id), 5000);
    return () => clearInterval(interval);
  }, [selected, loadMessages]);

  async function refresh() {
    setRefreshing(true);
    await loadConversations();
    if (selected) await loadMessages(selected.id);
    setRefreshing(false);
  }

  async function send() {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      const msg = await r.json();
      setMessages((p) => [...p, msg]);
      setText("");
      toast.success("Enviado!");
      loadConversations();
    } catch { toast.error("Erro ao enviar"); }
    finally { setSending(false); }
  }

  function updateLabels(contactId: string, labels: string[]) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, contact: { ...c.contact, labels } } : c));
    if (selected?.contactId === contactId) setSelected((s: any) => ({ ...s, contact: { ...s.contact, labels } }));
  }

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.contact?.name?.toLowerCase().includes(q) || c.contact?.phone?.includes(q);
  });

  const isUnknown = selected && (!selected.contact?.name || selected.contact?.name === selected.contact?.phone);

  return (
    <div className="flex h-screen">
      {/* ── Lista de conversas ── */}
      <aside className="w-80 flex flex-col border-r border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Conversas</h2>
          <button onClick={refresh} className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 ${refreshing ? "animate-spin" : ""}`}><RefreshCw size={15} /></button>
        </div>
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..." className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
              <p>Nenhuma conversa</p>
              <p className="text-xs text-center px-4">Configure o webhook para receber mensagens</p>
            </div>
          )}
          {filtered.map((conv) => {
            const labels: string[] = conv.contact?.labels ?? [];
            const isSelected = selected?.id === conv.id;
            return (
              <div key={conv.id} onClick={() => setSelected(conv)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? "bg-brand-50 border-l-2 border-l-brand-600" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold shrink-0">
                  {(conv.contact?.name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-900 truncate">{conv.contact?.name || conv.contact?.phone}</p>
                    <span className="text-xs text-gray-400 shrink-0 ml-1">{conv.lastMessageAt ? msgTime(conv.lastMessageAt) : ""}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessageText || "Sem mensagens"}</p>
                  {labels.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {labels.slice(0, 3).map((l: string) => {
                        const cfg = LABEL_COLORS.find((lc) => lc.name === l);
                        return <span key={l} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: cfg?.color ?? "#6b7280" }}>{l}</span>;
                      })}
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
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
          <p className="font-medium text-lg">Selecione uma conversa</p>
          <p className="text-sm mt-1">As mensagens recebidas via WhatsApp aparecem aqui</p>
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 max-w-sm text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Configure o Webhook:</p>
            <p className="text-xs text-gray-500 mb-1">URL para Evolution API:</p>
            <code className="text-xs bg-gray-100 rounded px-2 py-1 block text-brand-700 break-all">
              https://SEU_DOMINIO/api/webhook
            </code>
            <p className="text-xs text-gray-400 mt-2">Evento: <strong>MESSAGES_UPSERT</strong></p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">
              {(selected.contact?.name?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{selected.contact?.name || selected.contact?.phone}</p>
                {selected.contact?.role && <RoleBadge role={selected.contact.role} />}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Phone size={10} /> {selected.contact?.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isUnknown && (
                <button onClick={() => setNewContact(selected.contact)} className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                  <UserPlus size={13} /> Salvar contato
                </button>
              )}
              <div className="relative">
                <LabelManager contact={selected.contact} onUpdate={(labels: string[]) => updateLabels(selected.contactId, labels)} />
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Nenhuma mensagem ainda
              </div>
            )}
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showDate = !prev || !isToday(new Date(msg.sentAt)) || format(new Date(msg.sentAt), "dd/MM") !== format(new Date(prev.sentAt), "dd/MM");
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-500">
                        {isToday(new Date(msg.sentAt)) ? "Hoje" : isYesterday(new Date(msg.sentAt)) ? "Ontem" : format(new Date(msg.sentAt), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${msg.direction === "OUT" ? "justify-end" : "justify-start"} mb-1`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm ${msg.direction === "OUT" ? "bg-brand-600 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === "OUT" ? "text-brand-200" : "text-gray-400"}`}>
                        <span className="text-xs">{format(new Date(msg.sentAt), "HH:mm")}</span>
                        {msg.direction === "OUT" && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="w-10 h-10 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {newContact && (
        <NewContactModal
          phone={newContact.phone}
          name={newContact.name}
          onSave={() => { setNewContact(null); loadConversations(); }}
          onClose={() => setNewContact(null)}
        />
      )}
    </div>
  );
}
