"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Search, Clock, Phone, ChevronRight, Edit2, Filter, X } from "lucide-react";
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

function FilterPicker({ label, options, selected, onChange, placeholder }: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter(o => !q.trim() || o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-[11px] font-semibold text-gray-600 uppercase">{label}</span>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="ml-auto text-[10px] text-red-400 hover:text-red-600">limpar ({selected.length})</button>
        )}
      </div>
      {options.length > 8 && (
        <div className="px-2 py-1.5 border-b border-gray-100">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder ?? "Filtrar..."}
            className="w-full text-xs px-2 py-1 bg-transparent focus:outline-none" />
        </div>
      )}
      <div className="max-h-44 overflow-y-auto">
        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Nada</p>}
        {filtered.slice(0, 200).map(o => {
          const on = selected.includes(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={on} onChange={() => toggle(o.value)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span className="flex-1 text-gray-700 truncate">{o.label}</span>
              {o.count !== undefined && <span className="text-[10px] text-gray-400">{o.count}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
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
          <div>
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
            <select value={form.zona} onChange={f("zona")} className={inp}>
              <option value="">— Selecionar —</option>
              <option value="Urbano">Urbano</option>
              <option value="Rural">Rural</option>
            </select>
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
  const [opts, setOpts]         = useState<any | null>(null);
  const [labelDefs, setLabelDefs] = useState<any[]>([]);
  const [leaders, setLeaders]   = useState<any[]>([]);
  const [search, setSearch]     = useState("");
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [cidades,  setCidades]  = useState<string[]>([]);
  const [bairros,  setBairros]  = useState<string[]>([]);
  const [labelsFilter, setLabelsFilter] = useState<string[]>([]);
  const [liderIds, setLiderIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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

  const load = useCallback(async (p = 1) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (search) params.set("search", search);
    if (roleKeys.length) params.set("roleKeys", roleKeys.join(","));
    if (cidades.length)  params.set("cidades", cidades.join(","));
    if (bairros.length)  params.set("bairros", bairros.join(","));
    if (labelsFilter.length) params.set("labels", labelsFilter.join(","));
    if (liderIds.length) params.set("liderIds", liderIds.join(","));
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    setPages(data.pages ?? 1);
  }, [search, roleKeys, cidades, bairros, labelsFilter, liderIds]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  // Carrega opções de filtro
  useEffect(() => {
    fetch("/api/contacts/filter-options").then(r => r.json()).then(setOpts);
    fetch("/api/labels").then(r => r.json()).then(setLabelDefs);
  }, []);

  // Recarrega quando qualquer filtro muda (debounced no search)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1), 250);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleKeys, cidades, bairros, labelsFilter, liderIds]);

  // Carrega líderes ao abrir filtros
  useEffect(() => {
    if (showFilters && leaders.length === 0) {
      fetch("/api/contacts/leaders?limit=200").then(r => r.json()).then(setLeaders);
    }
  }, [showFilters, leaders.length]);

  const activeFilterCount = roleKeys.length + cidades.length + bairros.length + labelsFilter.length + liderIds.length;
  function clearAll() {
    setRoleKeys([]); setCidades([]); setBairros([]); setLabelsFilter([]); setLiderIds([]);
  }
  function toggle<T>(arr: T[], v: T): T[] { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }


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

      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-6 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${activeFilterCount > 0 ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Filter size={14} /> Filtros
            {activeFilterCount > 0 && <span className="bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <FilterPicker label="Papéis" options={(opts?.roles ?? []).map((r: any) => ({ value: r.key, label: r.label, count: r.count }))}
              selected={roleKeys} onChange={setRoleKeys} />
            <FilterPicker label="Líderes (rede direta)" options={leaders.map((l: any) => ({ value: l.id, label: l.name, count: l.childCount }))}
              selected={liderIds} onChange={setLiderIds} placeholder="Buscar líder..." />
            <FilterPicker label="Cidades" options={(opts?.cidades ?? []).map((c: any) => ({ value: c.value, label: c.value, count: c.count }))}
              selected={cidades} onChange={setCidades} />
            <FilterPicker label="Bairros" options={(opts?.bairros ?? []).map((b: any) => ({ value: b.value, label: b.value, count: b.count }))}
              selected={bairros} onChange={setBairros} />
            <FilterPicker label="Etiquetas" options={labelDefs.map((l: any) => ({ value: l.name, label: l.name }))}
              selected={labelsFilter} onChange={setLabelsFilter} />
          </div>
        )}
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
                    <Link href={`/contatos/${c.id}`} className="flex items-center gap-4 flex-1 min-w-0">
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
                    </Link>
                    {/* Kanban status */}
                    {(() => {
                      const conv = (c as any).conversations?.[0];
                      if (!conv || conv.closedAt) return null;
                      return (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: conv.status?.color ?? "#6366f1" }}>
                          {conv.status?.name ?? "—"}
                        </span>
                      );
                    })()}
                    {c._count && c._count.children > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c._count.children} na rede</span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(c); setModal("edit"); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
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
