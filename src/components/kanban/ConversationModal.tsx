"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { LabelManager, type LabelDef } from "@/components/ui/LabelManager";
import { Send, Clock, Archive, ClipboardList, Paperclip, CheckCheck, FileText, Mic } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ contact, size = 38 }: { contact: any; size?: number }) {
  const [err, setErr] = useState(false);
  const photo   = contact?.profilePhotoUrl;
  const initial = (contact?.name?.[0] ?? "?").toUpperCase();
  const s = { width: size, height: size, minWidth: size };
  if (photo && !err) return <img src={photo} alt="" style={s} className="rounded-full object-cover shrink-0" onError={() => setErr(true)} />;
  return (
    <div style={s} className="rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 text-sm shrink-0 select-none">
      {initial}
    </div>
  );
}

// ─── Media Bubble ─────────────────────────────────────────────────────────────

function MediaBubble({ messageId, mediaType }: { messageId: string; mediaType: string }) {
  const [src, setSrc]     = useState<string | null>(null);
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

  if (state === "error") return <p className="text-xs text-red-400">Mídia indisponível</p>;
  const loadBtn = (icon: string, label: string) => (
    <button onClick={load} disabled={state === "loading"}
      className="flex items-center gap-2 text-xs text-gray-500 bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg w-full justify-center">
      {state === "loading" ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span>{icon}</span>}
      {state === "loading" ? "Carregando…" : label}
    </button>
  );

  if (mediaType === "image") {
    if (state !== "ready") return loadBtn("🖼", "Ver imagem");
    return <img src={src!} className="rounded-xl max-w-full max-h-40 object-contain cursor-pointer" onClick={() => window.open(src!, "_blank")} alt="" />;
  }
  if (mediaType === "video") {
    if (state !== "ready") return loadBtn("🎬", "Ver vídeo");
    return <video src={src!} controls className="rounded-xl max-w-full max-h-40" />;
  }
  if (mediaType === "audio") {
    if (state !== "ready") return loadBtn("🎵", "Ouvir áudio");
    return <audio src={src!} controls className="w-full max-w-xs" />;
  }
  if (mediaType === "document") {
    if (state !== "ready") return loadBtn("📄", "Baixar arquivo");
    return <a href={src!} download className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"><FileText size={13} /> Baixar arquivo</a>;
  }
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  conversation: any;
  onClose: () => void;
  onCloseConversation?: (id: string) => void;
  labelDefs?: LabelDef[];
  onLabelsUpdate?: (contactId: string, labels: string[]) => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ConversationModal({ conversation, onClose, onCloseConversation, labelDefs, onLabelsUpdate }: Props) {
  const router = useRouter();
  const [messages, setMessages]       = useState<any[]>([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [attaching, setAttaching]     = useState(false);
  const [lastContact, setLastContact] = useState(conversation.contact?.lastContactAt ?? "");
  const [labels, setLabels]           = useState<string[]>(conversation.contact?.labels ?? []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const r = await fetch(`/api/conversations/${conversation.id}`);
      const d = await r.json();
      const msgs: any[] = d.messages ?? [];
      const unique = Array.from(new Map(msgs.map(m => [m.id, m])).values());
      setMessages(unique);
    } catch {}
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 6000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages.length]);

  async function sendText() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${conversation.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const msg = await r.json();
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setText("");
    } catch { toast.error("Erro ao enviar"); }
    finally { setSending(false); }
  }

  async function sendFile(file: File) {
    setAttaching(true);
    try {
      const base64 = await new Promise<string>(res => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const r = await fetch(`/api/conversations/${conversation.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      });
      const msg = await r.json();
      setMessages(prev => [...prev, msg]);
    } catch { toast.error("Erro ao enviar arquivo"); }
    finally { setAttaching(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function saveLastContact() {
    await fetch(`/api/contacts/${conversation.contactId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactAt: lastContact || null }),
    });
    toast.success("Salvo!");
  }

  async function closeConversation() {
    await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close: true }),
    });
    toast.success("Conversa fechada");
    onCloseConversation?.(conversation.id);
    onClose();
  }

  function handleLabelsUpdate(next: string[]) {
    setLabels(next);
    onLabelsUpdate?.(conversation.contactId, next);
  }

  function dayLabel(d: Date) {
    if (isToday(d))     return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd 'de' MMMM", { locale: ptBR });
  }

  const contact = conversation.contact;

  return (
    <Modal open title="" onClose={onClose} size="lg">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
        <Avatar contact={contact} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
            {contact.role && <RoleBadge role={contact.role} />}
          </div>
          <p className="text-xs text-gray-400">{contact.phone}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <LabelManager
            contactId={conversation.contactId}
            labels={labels}
            onUpdate={handleLabelsUpdate}
            labelDefs={labelDefs}
          />
          <button
            onClick={() => { router.push(`/demandas?contactId=${conversation.contactId}&conversaId=${conversation.id}`); onClose(); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors">
            <ClipboardList size={13} /> Demanda
          </button>
          <button onClick={closeConversation}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
            <Archive size={13} /> Fechar
          </button>
        </div>
      </div>
      {/* Último contato — linha compacta */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <Clock size={11} />
        <span className="shrink-0">Último contato:</span>
        <input type="datetime-local" value={lastContact ? lastContact.slice(0, 16) : ""}
          onChange={e => setLastContact(e.target.value)}
          className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 flex-1 min-w-0" />
        <button onClick={saveLastContact} className="text-brand-600 hover:underline text-xs shrink-0">salvar</button>
      </div>

      {/* ── Mensagens ── */}
      <div className="bg-[#f0f2f5] rounded-xl px-3 py-2 h-72 overflow-y-auto flex flex-col gap-0.5 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-10">Nenhuma mensagem</p>
        )}
        {messages.map((msg, i) => {
          const prev    = messages[i - 1];
          const day     = format(new Date(msg.sentAt), "dd/MM/yyyy");
          const prevDay = prev ? format(new Date(prev.sentAt), "dd/MM/yyyy") : null;
          const isOut   = msg.direction === "OUT";
          return (
            <div key={msg.id}>
              {day !== prevDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] bg-white rounded-full px-3 py-1 text-gray-500 shadow-sm border border-gray-100">
                    {dayLabel(new Date(msg.sentAt))}
                  </span>
                </div>
              )}
              <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isOut ? "bg-[#d9fdd3] rounded-br-sm" : "bg-white rounded-bl-sm border border-gray-100"}`}>
                  {msg.mediaType && !isOut && <div className="mb-1.5"><MediaBubble messageId={msg.id} mediaType={msg.mediaType} /></div>}
                  {msg.content && <p className="text-gray-800 whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>}
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

      {/* ── Input ── */}
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); }} />
        <button onClick={() => fileRef.current?.click()} disabled={attaching}
          className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0 ${attaching ? "text-brand-500 animate-pulse" : "text-gray-400"}`}>
          <Paperclip size={18} />
        </button>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); sendText(); } }}
          placeholder="Mensagem..."
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all" />
        <button onClick={sendText} disabled={sending || !text.trim()}
          className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
          <Send size={15} />
        </button>
      </div>
    </Modal>
  );
}
