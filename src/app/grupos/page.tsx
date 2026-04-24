"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Users, Calendar, Trash2, Edit2, UserPlus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

function GroupForm({ initial, onSave, onClose }: any) {
  const [form, setForm] = useState({ name: "", description: "", date: "", ...initial });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/groups/${initial.id}` : "/api/groups";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Grupo salvo!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do grupo *</label><input required value={form.name} onChange={f("name")} placeholder="Ex: Reunião de Líderes Maio/25" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label><input value={form.description} onChange={f("description")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Data do evento</label><input type="date" value={form.date} onChange={f("date")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function AddMembersModal({ group, onClose }: any) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(group.members?.map((m: any) => m.contactId) ?? []));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/contacts").then((r) => r.json()).then(setContacts); }, []);

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const toggle = (id: string) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selected) }),
      });
      toast.success("Membros atualizados!"); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open title={`Membros — ${group.name}`} onClose={onClose} size="lg">
      <div className="relative mb-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 mb-4">
        {filtered.map((c) => (
          <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-brand-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">{c.phone}</p>
            </div>
            <RoleBadge role={c.role} />
          </label>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{selected.size} selecionados</span>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Confirmar"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function GruposPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [modal, setModal] = useState<"new" | "edit" | "members" | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/groups");
    setGroups(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id: string, name: string) {
    if (!confirm(`Deletar grupo "${name}"?`)) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    toast.success("Grupo removido"); load();
  }

  async function openMembers(g: any) {
    const r = await fetch(`/api/groups/${g.id}`);
    const detail = await r.json();
    setSelected(detail); setModal("members");
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div><h1 className="text-xl font-bold text-gray-900">Grupos</h1><p className="text-sm text-gray-500">{groups.length} grupos • use para disparos em massa</p></div>
        <button onClick={() => { setSelected(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Novo Grupo
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium">Nenhum grupo criado</p>
            <p className="text-sm mt-1">Crie grupos para organizar seus contatos e fazer disparos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{g.name}</p>
                    {g.description && <p className="text-sm text-gray-500 mt-0.5">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(g); setModal("edit"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Edit2 size={14} /></button>
                    <button onClick={() => del(g.id, g.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Users size={14} />{g._count?.members ?? 0} contatos</span>
                  {g.date && <span className="flex items-center gap-1.5"><Calendar size={14} />{format(new Date(g.date), "dd/MM/yyyy", { locale: ptBR })}</span>}
                </div>

                <div className="flex gap-2 mt-1">
                  <button onClick={() => openMembers(g)} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm py-2 rounded-lg transition-colors">
                    <UserPlus size={14} /> Gerenciar membros
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Grupo" : "Novo Grupo"}>
        <GroupForm initial={modal === "edit" ? selected : undefined} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>

      {modal === "members" && selected && (
        <AddMembersModal group={selected} onClose={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
