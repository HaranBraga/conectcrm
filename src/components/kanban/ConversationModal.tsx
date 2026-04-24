"use client";
import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface Props {
  conversation: any;
  onClose: () => void;
}

export function ConversationModal({ conversation, onClose }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastContact, setLastContact] = useState(conversation.contact.lastContactAt ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/conversations/${conversation.id}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${conversation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const msg = await r.json();
      setMessages((prev) => [...prev, msg]);
      setText("");
      setLastContact(new Date().toISOString());
      toast.success("Mensagem enviada!");
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  async function saveLastContact() {
    await fetch(`/api/contacts/${conversation.contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactAt: lastContact || null }),
    });
    toast.success("Último contato salvo!");
  }

  return (
    <Modal open title={conversation.contact.name} onClose={onClose} size="lg">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{conversation.contact.phone}</span>
            <RoleBadge role={conversation.contact.role} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={13} />
            <span>Último contato:</span>
            <input
              type="datetime-local"
              value={lastContact ? lastContact.slice(0, 16) : ""}
              onChange={(e) => setLastContact(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button onClick={saveLastContact} className="text-xs text-brand-600 hover:underline">salvar</button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 h-64 overflow-y-auto flex flex-col gap-2 mb-4">
        {messages.length === 0 && <p className="text-sm text-gray-400 text-center mt-8">Nenhuma mensagem ainda</p>}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === "OUT" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.direction === "OUT" ? "bg-brand-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"}`}>
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.direction === "OUT" ? "text-brand-200" : "text-gray-400"}`}>
                {format(new Date(msg.sentAt), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Digite uma mensagem..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </Modal>
  );
}
