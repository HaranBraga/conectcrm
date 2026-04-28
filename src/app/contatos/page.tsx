"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Clock, Phone, ChevronRight, Trash2, Edit2 } from "lucide-react";
import { RoleBadge, type PersonRole } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface Contact {
  id: string; name: string; phone: string; email?: string;
  roleId: string; role: PersonRole; parentId?: string; parent?: any;
  lastContactAt?: string; lastMessage?: string; notes?: string;
  dataNascimento?: string; genero?: string;
  rua?: string; bairro?: string; cidade?: string; zona?: string;
  _count?: { children: number };
}

function withBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
function stripBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d.slice(2) : d;
}

function ContactForm({ initial, onSave, onClose, contacts, roles }: {
  initial?: Partial<Contact>; onSave: () => void; onClose: () => void;
  contacts: Contact[]; roles: PersonRole[];
}) {
  const [form, setForm] = useState({
    name: "", email: "", notes: "", genero: "", rua: "", bairro: "", cidade: "", zona: "", dataNascimento: "",
    ...initial,
    phone: initial?.phone ? stripBR(initial.phone) : "",
    roleId: initial?.roleId ?? roles[roles.length - 1]?.id ?? "",
    parentId: initial?.parentId ?? "",
    dataNascimento: initial?.dataNascimento ? initial.dataNascimento.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/contacts/${initial.id}` : "/api/contacts";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: withBR(form.phone), parentId: form.parentId || null }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success(initial?.id ? "Contato atualizado!" : "Contato criado!");
      onSave();
    } finally { setSaving(false); }
  }

  const currentRole = roles.find(r => r.id === form.roleId);
  const eligibleParents = contacts.filter((c) => {
    const pr = roles.find(r => r.id === c.roleId);
    return c.id !== initial?.id && pr && currentRole && pr.level < currentRole.level;
  });

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input required value={form.name} onChange={f("name")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-xs text-gray-400">DDD + número</span></label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 select-none">+55</span>
              <input required value={form.phone} onChange={f("phone")} placeholder="11999999999" className="flex-1 px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={f("email")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <select value={form.roleId} onChange={f("roleId")} className={inp}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <select value={form.parentId} onChange={f("parentId")} className={inp}>
              <option value="">— Nenhum —</option>
              {eligibleParents.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados Pessoais</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={f("dataNascimento")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <select value={form.genero} onChange={f("genero")} className={inp}>
              <option value="">— Selecionar —</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
            <input value={form.rua} onChange={f("rua")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input value={form.bairro} onChange={f("bairro")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={form.cidade} onChange={f("cidade")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <input value={form.zona} onChange={f("zona")} placeholder="Norte, Sul, Centro..." className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={2} value={form.notes} onChange={f("notes")} className={`${inp} resize-none`} />
      </div>

      <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

export default function ContatosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [roles, setRoles]       = useState<PersonRole[]>([]);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [modal, setModal]       = useState<"new" | "edit" | null>(null);
  const [editing, setEditing]   = useState<Contact | null>(null);
  const debounceRef             = useRef<NodeJS.Timeout>();

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  const load = useCallback(async (p = 1, q = search, r = roleFilter) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (q) params.set("search", q);
    if (r) params.set("roleId", r);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    setPages(data.pages ?? 1);
  }, [search, roleFilter]);

  useEffect(() => { loadRoles(); load(); }, [loadRoles]);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, v, roleFilter), 400);
  }
  function onRoleFilter(v: string) {
    setRoleFilter(v);
    load(1, search, v);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Deletar "${name}"?`)) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    toast.success("Contato removido");
    load(1);
  }

  const grouped = roles.reduce<Record<string, Contact[]>>((acc, role) => {
    acc[role.id] = contacts.filter((c) => c.roleId === role.id);
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contatos</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString("pt-BR")} contatos cadastrados</p>
        </div>
        <button onClick={() => { setEditing(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Novo Contato
        </button>
      </header>

      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={(e) => onRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {roles.map((role) => {
          const group = grouped[role.id] ?? [];
          if (group.length === 0) return null;
          return (
            <div key={role.id}>
              <div className="flex items-center gap-2 mb-3">
                <RoleBadge role={role} />
                <span className="text-xs text-gray-400">{group.length}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {group.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 group">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0" style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                        {c.parent && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ChevronRight size={10} />{c.parent.name}</span>}
                        {c.cidade && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.cidade}</span>}
                        {c.zona   && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.zona}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Phone size={10} />{stripBR(c.phone)}</span>
                        {c.lastContactAt && (
                          <span className="flex items-center gap-1 text-gray-400"><Clock size={10} />
                            {formatDistanceToNow(new Date(c.lastContactAt), { locale: ptBR, addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    {c._count && c._count.children > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c._count.children} na rede</span>
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

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 pb-4">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
            <span className="text-sm text-gray-500">Página {page} de {pages}</span>
            <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Contato" : "Novo Contato"} size="lg">
        <ContactForm
          initial={editing ?? undefined}
          contacts={contacts}
          roles={roles}
          onSave={() => { setModal(null); load(1); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
