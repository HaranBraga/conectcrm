"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, Clock, Phone, ChevronRight, Edit2, Sparkles, Users,
  Calendar, Handshake, ArrowRight, MapPin,
} from "lucide-react";
import { RoleBadge, type PersonRole } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { ContactNotes } from "@/components/ui/ContactNotes";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface Contact {
  id: string; name: string; phone: string; email?: string;
  roleId: string; role: PersonRole; parentId?: string; parent?: any;
  lastContactAt?: string; lastMessage?: string; notes?: string;
  dataNascimento?: string; genero?: string;
  rua?: string; bairro?: string; cidade?: string; zona?: string;
  source?: string;
  _count?: { children: number };
}

function withBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
// Formato no input: 11 dígitos puros (DDD + número), ex: 68999551835
// Por baixo, ainda salvamos com 55 prefixado pra manter compat com Evolution
// e webhook (que recebem mensagens com código país).
function stripBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d.slice(2) : d;
}

/**
 * Form de contato. Aceita `promoteMode`: quando true, ao salvar muda o
 * source pra "manual" (promove o contato pra base). Mostra um aviso
 * visual no topo do form.
 */
function ContactForm({ initial, onSave, onClose, contacts, roles, promoteMode = false }: {
  initial?: Partial<Contact>; onSave: () => void; onClose: () => void;
  contacts: Contact[]; roles: PersonRole[]; promoteMode?: boolean;
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
      const body: any = {
        ...form,
        phone: withBR(form.phone),
        parentId: form.parentId || null,
      };
      if (promoteMode) body.source = "manual";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success(promoteMode ? "Contato movido para a base!" : (initial?.id ? "Contato atualizado!" : "Contato criado!"));
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
      {promoteMode && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <Sparkles size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-800">Promovendo contato para a base</p>
            <p className="text-emerald-700 mt-0.5 text-xs">Complete os dados abaixo. Após salvar, o contato sai da aba "Novos" e entra na base regular.</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input required value={form.name} onChange={f("name")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-xs text-gray-400">DDD + número (11 dígitos)</span></label>
            <input required type="tel" inputMode="numeric" pattern="[0-9]{10,11}"
              value={form.phone} maxLength={11}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
              placeholder="68999551835"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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

      {initial?.id ? (
        <ContactNotes contactId={initial.id} />
      ) : (
        <p className="text-xs text-gray-400 italic">As anotações ficam disponíveis após salvar o contato.</p>
      )}

      <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving}
          className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 ${promoteMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:bg-brand-700"}`}>
          {saving ? "Salvando..." : promoteMode ? "Mover pra base" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// ─── Aba "Novos": agrupamento por origem ─────────────────────────────────────

interface OriginGroup {
  type: "reuniao" | "agenda";
  id: string;
  titulo: string;
  when: string;
  local: string | null;
  contacts: Contact[];
}

function ContactRow({ contact, onPromote, onDelete }: {
  contact: Contact;
  onPromote: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
        style={{ backgroundColor: contact.role?.bgColor ?? "#f3f4f6", color: contact.role?.color ?? "#6b7280" }}>
        {contact.name[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 text-sm truncate">{contact.name}</p>
          {(contact as any)._role && (
            <span className="text-[9px] uppercase tracking-wide font-semibold text-violet-500">
              {(contact as any)._role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
          <Phone size={10} />
          <span>{stripBR(contact.phone)}</span>
        </div>
      </div>
      <button
        onClick={() => onPromote(contact)}
        className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2.5 py-1.5 shrink-0"
      >
        <ArrowRight size={11} /> Mover pra base
      </button>
      <button
        onClick={() => onDelete(contact)}
        className="text-xs text-gray-300 hover:text-red-500 px-1.5 py-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Excluir contato"
      >
        ✕
      </button>
    </div>
  );
}

function OriginGroupCard({ group, onPromote, onDelete }: {
  group: OriginGroup;
  onPromote: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}) {
  const [open, setOpen] = useState(true);
  const isReuniao = group.type === "reuniao";
  const accent = isReuniao
    ? { color: "violet", icon: Handshake, label: "Reunião" }
    : { color: "blue",   icon: Calendar,  label: "Agenda" };
  const Icon = accent.icon;
  const href = isReuniao ? `/reunioes/${group.id}` : `/agenda?evento=${group.id}`;

  return (
    <div className={`bg-white rounded-xl border-l-[3px] border border-gray-200 overflow-hidden ${
      isReuniao ? "border-l-violet-400" : "border-l-blue-400"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/60">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isReuniao ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"
        }`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              isReuniao ? "text-violet-600" : "text-blue-600"
            }`}>{accent.label}</span>
            <a href={href} className="font-semibold text-gray-900 text-[15px] truncate hover:underline">
              {group.titulo}
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {format(new Date(group.when), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {group.local && (
              <span className="flex items-center gap-1 text-gray-400">
                <MapPin size={10} />{group.local}
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
          isReuniao ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
        }`}>
          {group.contacts.length} novo{group.contacts.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 shrink-0"
        >
          {open ? "Esconder" : "Mostrar"}
        </button>
      </div>

      {open && (
        <div className="divide-y divide-gray-100">
          {group.contacts.map(c => (
            <ContactRow key={c.id} contact={c} onPromote={onPromote} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContatosPage() {
  const [tab, setTab] = useState<"base" | "novos">("base");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [novosGroups, setNovosGroups] = useState<OriginGroup[]>([]);
  const [novosOrphans, setNovosOrphans] = useState<Contact[]>([]);
  const [novosTotal, setNovosTotal] = useState(0);
  const [roles, setRoles]       = useState<PersonRole[]>([]);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [modal, setModal]       = useState<"new" | "edit" | "promote" | null>(null);
  const [editing, setEditing]   = useState<Contact | null>(null);
  const debounceRef             = useRef<NodeJS.Timeout>();

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  const load = useCallback(async (p = 1, q = search, r = roleFilter) => {
    const params = new URLSearchParams({ page: String(p), limit: "50", source: "base" });
    if (q) params.set("search", q);
    if (r) params.set("roleId", r);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    setPages(data.pages ?? 1);
  }, [search, roleFilter]);

  const loadNovos = useCallback(async () => {
    const res = await fetch(`/api/contacts/novos-grouped`);
    if (!res.ok) return;
    const data = await res.json();
    setNovosGroups(data.groups ?? []);
    setNovosOrphans(data.orphans ?? []);
    setNovosTotal(data.totalContacts ?? 0);
  }, []);

  useEffect(() => { loadRoles(); load(); loadNovos(); }, [loadRoles, loadNovos]);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, v, roleFilter), 400);
  }
  function onRoleFilter(v: string) {
    setRoleFilter(v);
    load(1, search, v);
  }

  async function handleDeleteNovo(c: Contact) {
    if (!confirm(`Excluir "${c.name}" definitivamente? (não vai mais aparecer na lista)`)) return;
    const r = await fetch(`/api/contacts/${c.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
    toast.success("Excluído");
    loadNovos();
  }

  function reloadAfterPromote() {
    setModal(null);
    setEditing(null);
    loadNovos();
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
          <p className="text-sm text-gray-500">
            {tab === "base"
              ? `${total.toLocaleString("pt-BR")} contatos na base`
              : `${novosTotal.toLocaleString("pt-BR")} contato(s) aguardando triagem`}
          </p>
        </div>
        {tab === "base" && (
          <button onClick={() => { setEditing(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Novo Contato
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 bg-white border-b border-gray-200">
        <button onClick={() => setTab("base")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === "base" ? "text-brand-700 border-brand-600 bg-brand-50/50" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
          <Users size={14} /> Base
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "base" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>{total}</span>
        </button>
        <button onClick={() => setTab("novos")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === "novos" ? "text-emerald-700 border-emerald-600 bg-emerald-50/50" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
          <Sparkles size={14} /> Novos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === "novos" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{novosTotal}</span>
        </button>
      </div>

      {tab === "base" ? (
        <>
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
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {novosTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Sparkles size={32} className="text-gray-300 mb-2" />
              <p className="font-medium">Nenhum contato aguardando triagem</p>
              <p className="text-sm mt-1">Contatos criados via reuniões e agenda aparecem aqui antes de virarem da base</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
              {novosGroups.map(g => (
                <OriginGroupCard
                  key={`${g.type}-${g.id}`}
                  group={g}
                  onPromote={(c) => { setEditing(c); setModal("promote"); }}
                  onDelete={handleDeleteNovo}
                />
              ))}

              {novosOrphans.length > 0 && (
                <div className="bg-white rounded-xl border-l-[3px] border-l-gray-300 border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/60">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sem origem ativa</span>
                      <p className="text-sm text-gray-600">
                        Contatos criados antigamente ou cuja reunião/evento foi removido
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0">
                      {novosOrphans.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {novosOrphans.map(c => (
                      <ContactRow
                        key={c.id}
                        contact={c}
                        onPromote={(c) => { setEditing(c); setModal("promote"); }}
                        onDelete={handleDeleteNovo}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Contato" : "Novo Contato"} size="lg">
        <ContactForm
          initial={editing ?? undefined}
          contacts={contacts}
          roles={roles}
          onSave={() => { setModal(null); load(1); }}
          onClose={() => setModal(null)}
        />
      </Modal>

      <Modal open={modal === "promote"} onClose={() => setModal(null)} title="Mover Contato para a Base" size="lg">
        <ContactForm
          initial={editing ?? undefined}
          contacts={contacts}
          roles={roles}
          promoteMode
          onSave={reloadAfterPromote}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
