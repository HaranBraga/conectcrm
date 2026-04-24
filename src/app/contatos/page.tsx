"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Clock, Phone, ChevronRight, Trash2, Edit2 } from "lucide-react";
import { RoleBadge, ROLE_LABELS, ROLE_ORDER } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const ROLES = ROLE_ORDER;

interface Contact {
  id: string; name: string; phone: string; email?: string;
  role: string; parentId?: string; parent?: any;
  lastContactAt?: string; lastMessage?: string; notes?: string;
  _count?: { children: number };
}

function ContactForm({ initial, onSave, onClose, contacts }: { initial?: Partial<Contact>; onSave: () => void; onClose: () => void; contacts: Contact[] }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "APOIADOR", parentId: "", notes: "", ...initial });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/contacts/${initial.id}` : "/api/contacts";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, parentId: form.parentId || null }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success(initial?.id ? "Contato atualizado!" : "Contato criado!");
      onSave();
    } finally { setSaving(false); }
  }

  const eligibleParents = contacts.filter((c) => {
    const roleIdx = ROLE_ORDER.indexOf(form.role);
    const parentIdx = ROLE_ORDER.indexOf(c.role);
    return c.id !== initial?.id && parentIdx < roleIdx;
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required value={form.name} onChange={f("name")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-gray-400">(somente números)</span></label><input required value={form.phone} onChange={f("phone")} placeholder="5511999999999" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label><input type="email" value={form.email} onChange={f("email")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo (Hierarquia)</label>
          <select value={form.role} onChange={f("role")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsável (superior)</label>
          <select value={form.parentId} onChange={f("parentId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Nenhum —</option>
            {eligibleParents.map((c) => <option key={c.id} value={c.id}>{c.name} ({ROLE_LABELS[c.role]})</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={3} value={form.notes} onChange={f("notes")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" /></div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

export default function ContatosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    const r = await fetch(`/api/contacts?${params}`);
    setContacts(await r.json());
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string, name: string) {
    if (!confirm(`Deletar "${name}"?`)) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    toast.success("Contato removido");
    load();
  }

  const grouped = ROLE_ORDER.reduce<Record<string, Contact[]>>((acc, role) => {
    acc[role] = contacts.filter((c) => c.role === role);
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div><h1 className="text-xl font-bold text-gray-900">Contatos</h1><p className="text-sm text-gray-500">{contacts.length} contatos cadastrados</p></div>
        <button onClick={() => { setEditing(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Novo Contato
        </button>
      </header>

      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {ROLE_ORDER.map((role) => {
          const group = grouped[role];
          if (group.length === 0) return null;
          return (
            <div key={role}>
              <div className="flex items-center gap-2 mb-3">
                <RoleBadge role={role} />
                <span className="text-xs text-gray-400">{group.length}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {group.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 group">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                        {c.parent && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ChevronRight size={10} />{c.parent.name}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>
                        {c.lastContactAt && (
                          <span className="flex items-center gap-1 text-gray-400"><Clock size={10} />
                            {formatDistanceToNow(new Date(c.lastContactAt), { locale: ptBR, addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    {c._count && c._count.children > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c._count.children} subordinados</span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(c); setModal("edit"); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                      <button onClick={() => del(c.id, c.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium">Nenhum contato encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Contato" para adicionar</p>
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Contato" : "Novo Contato"}>
        <ContactForm initial={editing ?? undefined} contacts={contacts} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
