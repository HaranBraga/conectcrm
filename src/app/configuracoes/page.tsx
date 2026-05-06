"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, Tags, Layout, Briefcase, Calendar, ClipboardList,
  Users as UsersIcon, KeyRound, ShieldCheck, Search, Eye, EyeOff,
  History, Filter, X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { type PersonRole } from "@/components/ui/RoleBadge";
import { MODULES } from "@/lib/modules";
import toast from "react-hot-toast";

// ─── Color picker ────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presets = ["#6366f1", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#6b7280", "#14b8a6", "#f97316"];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: value }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-gray-800 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

const INP = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// ─── Forms ───────────────────────────────────────────────────────────────────

function StatusForm({ initial, onSave, onClose }: any) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/kanban/${initial.id}` : "/api/kanban";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Status salvo!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome da coluna *</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Em Negociação" className={INP} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor</label><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function RoleForm({ initial, onSave, onClose }: any) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? "#eef2ff");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch(`/api/roles/${initial.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color, bgColor }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Cargo atualizado!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do cargo *</label><input required value={label} onChange={(e) => setLabel(e.target.value)} className={INP} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label><ColorPicker value={color} onChange={setColor} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label><ColorPicker value={bgColor} onChange={setBgColor} /></div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500">Prévia:</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, backgroundColor: bgColor }}>{label || "Cargo"}</span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function LabelForm({ initial, onSave, onClose }: any) {
  const [name, setName]       = useState(initial?.name    ?? "");
  const [color, setColor]     = useState(initial?.color   ?? "#6366f1");
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? "#eef2ff");
  const [saving, setSaving]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url    = initial?.id ? `/api/labels/${initial.id}` : "/api/labels";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color, bgColor }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Etiqueta salva!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Interessado" className={INP} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label><ColorPicker value={color} onChange={setColor} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label><ColorPicker value={bgColor} onChange={setBgColor} /></div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500">Prévia:</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: bgColor }}>{name || "Etiqueta"}</span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function CalendarioForm({ initial, onSave, onClose }: any) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [cor,  setCor]  = useState(initial?.cor  ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url    = initial?.id ? `/api/agenda/calendarios/${initial.id}` : "/api/agenda/calendarios";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, cor }) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Calendário salvo!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Agenda Política" className={INP} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor</label><ColorPicker value={cor} onChange={setCor} /></div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500">Prévia:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} /><span className="text-sm font-medium text-gray-800">{nome || "Calendário"}</span></span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function toKey(label: string) {
  return label.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

// ─── Section helpers ─────────────────────────────────────────────────────────

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ─── User form ───────────────────────────────────────────────────────────────

function UserForm({ initial, onSave, onClose }: { initial?: any; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [modules, setModules] = useState<string[]>(initial?.modules ?? []);
  const [saving, setSaving] = useState(false);

  function toggleModule(key: string) {
    setModules(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url    = initial?.id ? `/api/users/${initial.id}` : "/api/users";
      const body: any = { name, username, isAdmin, active, modules };
      if (password) body.password = password;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success(initial?.id ? "Usuário atualizado" : "Usuário criado");
      onSave(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
          <input required value={name} onChange={e => setName(e.target.value)} className={INP} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Usuário (login) *</label>
          <input required value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="ex: joao_silva" autoCapitalize="none" spellCheck={false} className={INP} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {initial?.id ? "Nova senha (deixe em branco para manter)" : "Senha *"}
        </label>
        <div className="relative">
          <input required={!initial?.id} type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" className={INP + " pr-10"} />
          <button type="button" onClick={() => setShowPwd(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <ShieldCheck size={14} className="text-amber-500" />
          <span className="text-gray-700">Administrador (acesso total + configurações)</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <span className="text-gray-700">Ativo</span>
        </label>
      </div>

      {!isAdmin && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Módulos liberados</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODULES.map(m => (
              <label key={m.key} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${modules.includes(m.key) ? "border-brand-300 bg-brand-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={modules.includes(m.key)} onChange={() => toggleModule(m.key)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-gray-700">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
          {saving ? "Salvando..." : (initial?.id ? "Atualizar" : "Criar usuário")}
        </button>
      </div>
    </form>
  );
}

// ─── Audit Logs panel ────────────────────────────────────────────────────────

const ACTION_GROUPS: { label: string; prefix?: string; action?: string }[] = [
  { label: "Tudo" },
  { label: "Login",       prefix: "user.login" },
  { label: "Usuários",    prefix: "user." },
  { label: "Contatos",    prefix: "contact." },
  { label: "Campanhas",   prefix: "campaign." },
  { label: "Aniversários", prefix: "birthday." },
  { label: "Demandas",    prefix: "demanda." },
  { label: "Reuniões",    prefix: "reuniao." },
  { label: "Agenda",      prefix: "agenda." },
  { label: "Kanban",      prefix: "kanban." },
];

const ACTION_FRIENDLY: Record<string, string> = {
  "user.login":           "Login",
  "user.login_failed":    "Falha de login",
  "user.logout":          "Logout",
  "user.password_change": "Trocou a senha",
  "user.create":          "Criou usuário",
  "user.update":          "Atualizou usuário",
  "user.delete":          "Excluiu usuário",
  "contact.create":       "Criou contato",
  "contact.update":       "Atualizou contato",
  "contact.delete":       "Excluiu contato",
  "campaign.create":      "Criou campanha",
  "campaign.update":      "Atualizou campanha",
  "campaign.delete":      "Excluiu campanha",
  "campaign.send":        "Enviou (campanha)",
  "campaign.batch_send":  "Envio em lote",
  "birthday.send":        "Enviou aniversário",
  "demanda.create":       "Criou demanda",
  "demanda.update":       "Atualizou demanda",
  "demanda.delete":       "Excluiu demanda",
  "reuniao.create":       "Criou reunião",
  "reuniao.update":       "Atualizou reunião",
  "reuniao.delete":       "Excluiu reunião",
  "agenda.create":        "Criou evento",
  "agenda.update":        "Atualizou evento",
  "agenda.delete":        "Excluiu evento",
  "kanban.move":          "Moveu card no kanban",
  "config.update":        "Mudou config",
};

function actionColor(action: string): string {
  if (action.endsWith(".delete") || action === "user.login_failed") return "bg-red-50 text-red-700 border-red-200";
  if (action.endsWith(".create") || action === "user.login")        return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.endsWith(".update"))                                   return "bg-blue-50 text-blue-700 border-blue-200";
  if (action.endsWith(".send") || action.endsWith(".batch_send"))   return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AuditLogsPanel({ users }: { users: any[] }) {
  const [logs, setLogs]     = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  // filtros
  const [userId, setUserId]       = useState("");
  const [groupIdx, setGroupIdx]   = useState(0);   // 0 = Tudo
  const [search, setSearch]       = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  const [openMeta, setOpenMeta] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (userId)            qs.set("userId", userId);
      const grp = ACTION_GROUPS[groupIdx];
      if (grp.prefix && groupIdx !== 0) qs.set("actionPrefix", grp.prefix);
      if (grp.action)        qs.set("action", grp.action);
      if (search.trim())     qs.set("search", search.trim());
      if (dateFrom)          qs.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo)            qs.set("dateTo",   new Date(dateTo + "T23:59:59").toISOString());
      qs.set("page", String(page));
      qs.set("limit", "50");

      const r = await fetch("/api/audit-logs?" + qs.toString());
      if (!r.ok) { toast.error("Erro ao buscar logs"); return; }
      const d = await r.json();
      setLogs(d.logs);
      setTotal(d.total);
    } finally {
      setLoading(false);
    }
  }, [userId, groupIdx, search, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  function clearFilters() {
    setUserId(""); setGroupIdx(0); setSearch(""); setDateFrom(""); setDateTo(""); setPage(1);
  }

  const hasFilters = !!(userId || groupIdx !== 0 || search || dateFrom || dateTo);
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <section>
      <SectionHeader
        title="Logs de Auditoria"
        description="Histórico de ações realizadas no sistema — útil pra rastrear quem fez o quê e quando"
      />

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Buscar</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Texto na descrição..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Usuário</label>
          <select
            value={userId}
            onChange={e => { setUserId(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Tipo</label>
          <select
            value={groupIdx}
            onChange={e => { setGroupIdx(Number(e.target.value)); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {ACTION_GROUPS.map((g, i) => <option key={i} value={i}>{g.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">De</label>
          <input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Até</label>
          <input
            type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-2">
        {loading ? "Carregando..." : `${total} registro(s)`}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {!loading && logs.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">Nenhum log encontrado</p>
        )}
        {logs.map(l => {
          const friendly = ACTION_FRIENDLY[l.action] ?? l.action;
          const expanded = openMeta === l.id;
          return (
            <div key={l.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${actionColor(l.action)}`}>
                  {friendly}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{l.summary ?? "—"}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-gray-500">{l.userName ?? "—"}</span>
                    <span>·</span>
                    <span>{fmtDateTime(l.createdAt)}</span>
                    {l.ipAddress && <><span>·</span><span className="font-mono text-gray-400">{l.ipAddress}</span></>}
                  </p>
                </div>
                {l.meta && (
                  <button
                    onClick={() => setOpenMeta(expanded ? null : l.id)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    {expanded ? "Esconder" : "Detalhes"}
                  </button>
                )}
              </div>
              {expanded && l.meta && (
                <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-auto text-gray-600">
                  {JSON.stringify(l.meta, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">Página {page} de {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "cargos",      label: "Cargos",       icon: Briefcase   },
  { key: "kanban",      label: "Kanban",       icon: Layout      },
  { key: "demandas",    label: "Demandas",     icon: ClipboardList },
  { key: "etiquetas",   label: "Etiquetas",    icon: Tags        },
  { key: "calendarios", label: "Calendários",  icon: Calendar    },
  { key: "usuarios",    label: "Usuários",     icon: UsersIcon   },
  { key: "logs",        label: "Logs",         icon: History     },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<TabKey>("cargos");

  // Estados das diversas seções
  const [statuses, setStatuses]       = useState<any[]>([]);
  const [roles, setRoles]             = useState<PersonRole[]>([]);
  const [labels, setLabels]           = useState<any[]>([]);
  const [calendarios, setCalendarios] = useState<any[]>([]);
  const [demandaCfg, setDemandaCfg]   = useState<any>({ statuses: [], prioridades: [], segmentos: [] });
  const [users, setUsers]             = useState<any[]>([]);

  const [modal, setModal] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const loadStatuses    = useCallback(async () => setStatuses(await (await fetch("/api/kanban")).json()), []);
  const loadRoles       = useCallback(async () => setRoles(await (await fetch("/api/roles")).json()), []);
  const loadLabels      = useCallback(async () => setLabels(await (await fetch("/api/labels")).json()), []);
  const loadCalendarios = useCallback(async () => setCalendarios(await (await fetch("/api/agenda/calendarios")).json()), []);
  const loadDemandaCfg  = useCallback(async () => setDemandaCfg(await (await fetch("/api/demandas/config")).json()), []);
  const loadUsers       = useCallback(async () => setUsers(await (await fetch("/api/users")).json()), []);

  useEffect(() => { loadStatuses(); loadRoles(); loadLabels(); loadCalendarios(); loadDemandaCfg(); loadUsers(); },
    [loadStatuses, loadRoles, loadLabels, loadCalendarios, loadDemandaCfg, loadUsers]);

  async function saveDemandaCfg(patch: any) {
    const updated = { ...demandaCfg, ...patch };
    setDemandaCfg(updated);
    await fetch("/api/demandas/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    await loadDemandaCfg();
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Gestão das opções e permissões do sistema</p>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de tabs */}
        <aside className="w-56 bg-white border-r border-gray-200 p-3 shrink-0 overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {tab === "cargos" && (
              <section>
                <SectionHeader title="Cargos e Hierarquia" description="A ordem reflete a hierarquia (níveis dos contatos)" />
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center gap-4 px-4 py-3 group">
                      <span className="text-xs text-gray-400 w-5 text-center">{role.level + 1}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: role.color, backgroundColor: role.bgColor }}>{role.label}</span>
                      <span className="flex-1 text-xs text-gray-400 font-mono">{role.key}</span>
                      <button onClick={() => { setEditing(role); setModal("editRole"); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "kanban" && (
              <section>
                <SectionHeader title="Colunas do Kanban" description="Pipeline de conversas — colunas exibidas em ordem"
                  action={<button onClick={() => { setEditing(null); setModal("newStatus"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Nova coluna</button>} />
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {statuses.length === 0 && <p className="py-10 text-center text-gray-400 text-sm">Nenhuma coluna criada</p>}
                  {statuses.map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-4 py-3 group">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 font-medium text-sm text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.conversations?.length ?? 0} cards</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditing(s); setModal("editStatus"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={async () => {
                          const r = await fetch(`/api/kanban/${s.id}`, { method: "DELETE" });
                          if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
                          toast.success(`"${s.name}" removido`); loadStatuses();
                        }} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "demandas" && (
              <div className="flex flex-col gap-8">
                <section>
                  <SectionHeader title="Status de Demandas" description="Colunas do kanban de demandas" />
                  <SimpleListEditor items={demandaCfg.statuses} placeholder="Novo status..."
                    onChange={next => saveDemandaCfg({ demanda_statuses: next })}
                    fields={[{ key: "color", type: "color", default: "#6366f1" }, { key: "isClosed", type: "checkbox", label: "Fecha" }]}
                    keyFromLabel
                  />
                </section>
                <section>
                  <SectionHeader title="Prioridades" description="Mais urgente primeiro" />
                  <SimpleListEditor items={demandaCfg.prioridades} placeholder="Nova prioridade..."
                    onChange={next => saveDemandaCfg({ demanda_prioridades: next })}
                    fields={[{ key: "color", type: "color", default: "#6b7280" }, { key: "bgColor", type: "color", default: "#f3f4f6" }]}
                    keyFromLabel
                  />
                </section>
                <section>
                  <SectionHeader title="Segmentos" description="Categorias para classificar demandas" />
                  <StringListEditor items={demandaCfg.segmentos} placeholder="Novo segmento..."
                    onChange={next => saveDemandaCfg({ demanda_segmentos: next })} />
                </section>
              </div>
            )}

            {tab === "etiquetas" && (
              <section>
                <SectionHeader title="Etiquetas" description="Etiquetas usadas em conversas e contatos"
                  action={<button onClick={() => { setEditing(null); setModal("newLabel"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Nova etiqueta</button>} />
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {labels.length === 0 && <p className="py-10 text-center text-gray-400 text-sm">Nenhuma etiqueta</p>}
                  {labels.map(l => (
                    <div key={l.id} className="flex items-center gap-4 px-4 py-3 group">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ color: l.color, backgroundColor: l.bgColor }}>{l.name}</span>
                      <div className="flex-1" />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditing(l); setModal("editLabel"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={async () => { await fetch(`/api/labels/${l.id}`, { method: "DELETE" }); toast.success(`"${l.name}" removida`); loadLabels(); }} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "calendarios" && (
              <section>
                <SectionHeader title="Calendários da Agenda" description="Calendários exibidos na Agenda"
                  action={<button onClick={() => { setEditing(null); setModal("newCal"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Novo calendário</button>} />
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {calendarios.length === 0 && <p className="py-10 text-center text-gray-400 text-sm">Nenhum calendário</p>}
                  {calendarios.map(c => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3 group">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                      <span className="flex-1 font-medium text-sm text-gray-800">{c.nome}</span>
                      {c.isPadrao && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">Padrão</span>}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditing(c); setModal("editCal"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                        {!c.isPadrao && (
                          <button onClick={async () => { const r = await fetch(`/api/agenda/calendarios/${c.id}`, { method: "DELETE" }); if (!r.ok) { const d = await r.json(); toast.error(d.error); return; } toast.success(`"${c.nome}" removido`); loadCalendarios(); }} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "logs" && (
              <AuditLogsPanel users={users} />
            )}

            {tab === "usuarios" && (
              <section>
                <SectionHeader title="Usuários" description="Cadastre os membros da equipe e defina o que cada um pode acessar"
                  action={<button onClick={() => { setEditing(null); setModal("newUser"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Novo usuário</button>} />
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {users.length === 0 && <p className="py-10 text-center text-gray-400 text-sm">Nenhum usuário</p>}
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3 group">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">{u.name}</p>
                          {u.isAdmin && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"><ShieldCheck size={9} />Admin</span>}
                          {!u.active && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inativo</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">@{u.username ?? "(sem usuário)"}</p>
                        {!u.isAdmin && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {u.modules?.length === 0 ? "Sem módulos liberados" : `${u.modules.length} módulo(s): ${u.modules.join(", ")}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditing(u); setModal("editUser"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={async () => {
                          if (!confirm(`Excluir "${u.name}"?`)) return;
                          const r = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                          if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
                          toast.success("Excluído"); loadUsers();
                        }} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <Modal open={modal === "newStatus"} onClose={() => setModal(null)} title="Nova Coluna" size="sm">
        <StatusForm onSave={() => { setModal(null); loadStatuses(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editStatus"} onClose={() => setModal(null)} title="Editar Coluna" size="sm">
        <StatusForm initial={editing} onSave={() => { setModal(null); loadStatuses(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editRole"} onClose={() => setModal(null)} title="Editar Cargo" size="sm">
        <RoleForm initial={editing} onSave={() => { setModal(null); loadRoles(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "newLabel"} onClose={() => setModal(null)} title="Nova Etiqueta" size="sm">
        <LabelForm onSave={() => { setModal(null); loadLabels(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editLabel"} onClose={() => setModal(null)} title="Editar Etiqueta" size="sm">
        <LabelForm initial={editing} onSave={() => { setModal(null); loadLabels(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "newCal"} onClose={() => setModal(null)} title="Novo Calendário" size="sm">
        <CalendarioForm onSave={() => { setModal(null); loadCalendarios(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editCal"} onClose={() => setModal(null)} title="Editar Calendário" size="sm">
        <CalendarioForm initial={editing} onSave={() => { setModal(null); loadCalendarios(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "newUser"} onClose={() => setModal(null)} title="Novo Usuário" size="lg">
        <UserForm onSave={loadUsers} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editUser"} onClose={() => setModal(null)} title="Editar Usuário" size="lg">
        <UserForm initial={editing} onSave={loadUsers} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}

// ─── Mini editores genéricos para listas (status/prio/segmento) ──────────────

function SimpleListEditor({ items, placeholder, onChange, fields, keyFromLabel }: {
  items: any[];
  placeholder: string;
  onChange: (next: any[]) => void;
  fields: { key: string; type: "color" | "checkbox"; default?: string; label?: string }[];
  keyFromLabel?: boolean;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newVals,  setNewVals]  = useState<any>(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? (f.type === "checkbox" ? false : "#6b7280")])));
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editVals, setEditVals] = useState<any>({});

  function add() {
    if (!newLabel.trim()) return;
    const item: any = { label: newLabel.trim(), position: items.length, ...newVals };
    if (keyFromLabel) item.key = toKey(newLabel);
    if (item.isClosed === undefined && fields.find(f => f.key === "isClosed")) item.isClosed = false;
    onChange([...items, item]);
    setNewLabel("");
  }

  function startEdit(i: number) {
    setEditIdx(i); setEditLabel(items[i].label);
    setEditVals(Object.fromEntries(fields.map(f => [f.key, items[i][f.key]])));
  }

  function saveEdit() {
    if (editIdx === null) return;
    const next = items.map((it, i) => i === editIdx ? { ...it, label: editLabel, ...editVals } : it);
    onChange(next); setEditIdx(null);
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-3">
        {items.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Nenhum item</p>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 group">
            {it.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: it.color }} />}
            {editIdx === i ? (
              <>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm" />
                {fields.map(f => f.type === "color" ? (
                  <input key={f.key} type="color" value={editVals[f.key]} onChange={e => setEditVals((v: any) => ({ ...v, [f.key]: e.target.value }))} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                ) : (
                  <label key={f.key} className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={!!editVals[f.key]} onChange={e => setEditVals((v: any) => ({ ...v, [f.key]: e.target.checked }))} className="rounded" /> {f.label}
                  </label>
                ))}
                <button onClick={saveEdit} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg">OK</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-800">{it.label}</span>
                {it.isClosed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Fecha</span>}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => startEdit(i)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={placeholder} className={INP + " flex-1"} />
        {fields.map(f => f.type === "color" && (
          <input key={f.key} type="color" value={newVals[f.key]} onChange={e => setNewVals((v: any) => ({ ...v, [f.key]: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
        ))}
        <button onClick={add} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Adicionar</button>
      </div>
    </>
  );
}

function StringListEditor({ items, placeholder, onChange }: { items: string[]; placeholder: string; onChange: (next: string[]) => void }) {
  const [newItem, setNewItem] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-3">
        {items.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Nenhum item</p>}
        {items.map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 group">
            {editIdx === i ? (
              <>
                <input value={editVal} onChange={e => setEditVal(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm" />
                <button onClick={() => { onChange(items.map((x, j) => j === i ? editVal : x)); setEditIdx(null); }} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg">OK</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{s}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => { setEditIdx(i); setEditVal(s); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) { onChange([...items, newItem.trim()]); setNewItem(""); } }} placeholder={placeholder} className={INP + " flex-1"} />
        <button onClick={() => { if (newItem.trim()) { onChange([...items, newItem.trim()]); setNewItem(""); } }} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Adicionar</button>
      </div>
    </>
  );
}
