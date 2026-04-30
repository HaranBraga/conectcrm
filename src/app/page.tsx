"use client";
import { useState, useEffect, useCallback } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Plus, RefreshCw, Settings, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { NewConversationModal } from "@/components/ui/NewConversationModal";
import { type PersonRole } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

function NewContactQuick({ onSave, onClose, roles }: { onSave: () => void; onClose: () => void; roles: PersonRole[] }) {
  const defaultRoleId = roles[roles.length - 1]?.id ?? "";
  const [form, setForm] = useState({ name: "", phone: "", roleId: defaultRoleId });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Contato adicionado!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required value={form.name} onChange={f("name")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-gray-400">(somente números)</span></label><input required value={form.phone} onChange={f("phone")} placeholder="5511999999999" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
        <select value={form.roleId} onChange={f("roleId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Adicionar"}</button>
      </div>
    </form>
  );
}

export default function KanbanPage() {
  const [columns, setColumns]   = useState<any[]>([]);
  const [roles, setRoles]       = useState<PersonRole[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [modal, setModal]       = useState(false);
  const [newConvModal, setNewConvModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [kanbanRes, rolesRes] = await Promise.all([fetch("/api/kanban"), fetch("/api/roles")]);
      if (!kanbanRes.ok) throw new Error();
      setColumns(await kanbanRes.json());
      setRoles(await rolesRes.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SSE: atualiza kanban em tempo real quando outro usuário move cards
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("kanban", () => load());
    return () => es.close();
  }, [load]);

  const total = columns.reduce((s, c) => s + c.conversations.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <div className="text-center"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm">Carregando kanban...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-400">
        <p className="text-lg font-medium text-gray-600">Erro ao conectar com o banco</p>
        <p className="text-sm">Verifique se o DATABASE_URL está correto nas variáveis de ambiente</p>
        <button onClick={load} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><RefreshCw size={15} /> Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500">{total} contatos • {columns.length} colunas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setNewConvModal(true)} className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm transition-colors">
            <MessageSquarePlus size={15} /> Nova Conversa
          </button>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Novo Contato
          </button>
          <button onClick={load} className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <p className="text-lg font-medium">Nenhuma coluna criada</p>
            <p className="text-sm">Vá em Configurações para criar as colunas do kanban</p>
            <Link href="/configuracoes" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Settings size={15} /> Ir para Configurações
            </Link>
          </div>
        ) : (
          <KanbanBoard initialColumns={columns} onRefresh={load} />
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Contato" size="sm">
        <NewContactQuick roles={roles} onSave={() => { setModal(false); load(); }} onClose={() => setModal(false)} />
      </Modal>

      {newConvModal && (
        <NewConversationModal
          onClose={() => setNewConvModal(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}
