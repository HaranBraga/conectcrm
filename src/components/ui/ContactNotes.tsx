"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

/**
 * Lista e CRUD de anotações de um contato. Usa a tabela ContactNote
 * (compartilhada com o painel-360 — o que você anota aqui aparece lá
 * na timeline do contato e vice-versa).
 */
export function ContactNotes({ contactId }: { contactId: string }) {
  const [notes, setNotes] = useState<any[] | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/contacts/${contactId}/notes`);
    if (r.ok) setNotes(await r.json());
    else setNotes([]);
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) { toast.error("Erro ao salvar anotação"); return; }
      setBody("");
      load();
    } finally { setSaving(false); }
  }

  async function del(noteId: string) {
    if (!confirm("Apagar esta anotação?")) return;
    await fetch(`/api/contacts/${contactId}/notes/${noteId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
          <FileText size={13} /> Anotações
        </label>
        <p className="text-[11px] text-gray-400 mb-2">As anotações são compartilhadas com o Painel 360 — aparecem na timeline da pessoa lá.</p>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={2}
          placeholder="Escreva uma nota e clique em adicionar..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        <div className="flex justify-end mt-2">
          <button type="button" onClick={add} disabled={saving || !body.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium">
            <Plus size={11} /> {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {notes === null ? (
        <p className="text-xs text-gray-400 text-center py-2">Carregando...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma anotação ainda</p>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {notes.map((n: any) => (
            <div key={n.id} className="px-3 py-2 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[10px] text-gray-400">
                  {format(new Date(n.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  {n.author?.name && <span> · {n.author.name}</span>}
                </p>
                <button onClick={() => del(n.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={11} /></button>
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
