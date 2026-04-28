"use client";
import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onCreated: (conv: any) => void;
}

export function NewConversationModal({ onClose, onCreated }: Props) {
  const [search, setSearch]     = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const debounce = useRef<NodeJS.Timeout>();

  function onSearch(v: string) {
    setSearch(v);
    setSelected(null);
    clearTimeout(debounce.current);
    if (!v.trim()) { setContacts([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/contacts?search=${encodeURIComponent(v)}&limit=10`);
        const d = await r.json();
        setContacts(d.contacts ?? []);
      } finally { setLoading(false); }
    }, 300);
  }

  async function start() {
    if (!selected || creating) return;
    setCreating(true);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selected.id }),
      });
      if (!r.ok) { toast.error("Erro ao iniciar conversa"); return; }
      const conv = await r.json();
      toast.success("Conversa iniciada!");
      onCreated(conv);
      onClose();
    } finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900">Nova Conversa</span>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Buscar contato por nome ou telefone..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {loading && (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 max-h-52 overflow-y-auto divide-y divide-gray-50">
            {contacts.map(c => (
              <div key={c.id} onClick={() => setSelected(c)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${selected?.id === c.id ? "bg-indigo-50" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                  {c.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </div>
                {selected?.id === c.id && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && search && contacts.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">Nenhum contato encontrado</p>
        )}

        <div className="flex gap-2 mt-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={start} disabled={!selected || creating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">
            {creating ? "Iniciando..." : "Iniciar conversa"}
          </button>
        </div>
      </div>
    </div>
  );
}
