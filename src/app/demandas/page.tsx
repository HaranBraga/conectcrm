"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Plus, Bell, User, Search, X, Trash2, Link as LinkIcon,
  CalendarClock, Archive, ArchiveRestore, LayoutDashboard, List, AlarmClock,
} from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StatusCfg  { key: string; label: string; color: string; isClosed: boolean; position: number; }
interface PrioCfg    { key: string; label: string; color: string; bgColor: string; position: number; }
interface DemandaCfg { statuses: StatusCfg[]; prioridades: PrioCfg[]; segmentos: string[]; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prio(cfg: PrioCfg[] | null, key: string): PrioCfg {
  return cfg?.find(p => p.key === key) ?? { key, label: key, color: "#6b7280", bgColor: "#f3f4f6", position: 99 };
}
function borderColor(p: PrioCfg): string {
  const map: Record<string, string> = { URGENTE: "#ef4444", IMPORTANTE: "#f97316", MEDIA: "#3b82f6", NORMAL: "#d1d5db" };
  return map[p.key] ?? p.color;
}

// ─── ContactSearch ────────────────────────────────────────────────────────────

function ContactSearch({ onSelect }: { onSelect: (c: any) => void }) {
  const [q, setQ]           = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen]     = useState(false);
  const debounce = useRef<NodeJS.Timeout>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function search(v: string) {
    setQ(v);
    clearTimeout(debounce.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(v)}&limit=8`);
      const d = await r.json();
      setResults(d.contacts ?? []);
      setOpen(true);
    }, 300);
  }

  function pick(c: any) { onSelect(c); setQ(c.name); setOpen(false); setResults([]); }

  return (
    <div className="relative" ref={ref}>
      <input value={q} onChange={e => search(e.target.value)} placeholder="Buscar contato pelo nome..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {open && results.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
          {results.map(c => (
            <div key={c.id} onClick={() => pick(c)} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
              {c.role && <RoleBadge role={c.role} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DemandaForm ──────────────────────────────────────────────────────────────

const INP = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function DemandaForm({ initial, initialContact, conversaId, cfg, onSave, onClose, onDelete, onArchive }: {
  initial?: any; initialContact?: any; conversaId?: string | null;
  cfg: DemandaCfg;
  onSave: (d: any) => void; onClose: () => void;
  onDelete?: () => void; onArchive?: () => void;
}) {
  const [solicitante, setSolicitante] = useState<any | null>(initial?.solicitante ?? initialContact ?? null);
  const [titulo,     setTitulo]     = useState(initial?.titulo     ?? "");
  const [descricao,  setDescricao]  = useState(initial?.descricao  ?? "");
  const [status,     setStatus]     = useState(initial?.status     ?? "ANALISAR");
  const [segmento,   setSegmento]   = useState(initial?.segmento   ?? "");
  const [prioridade, setPrioridade] = useState(initial?.prioridade ?? "NORMAL");
  const [valor,      setValor]      = useState(initial?.valor != null ? String(initial.valor) : "");
  const [obs,        setObs]        = useState(initial?.obs        ?? "");
  const [lembrete,   setLembrete]   = useState(initial?.lembrete  ? initial.lembrete.slice(0, 16) : "");
  const [prazo,      setPrazo]      = useState(initial?.prazo     ? initial.prazo.slice(0, 16) : "");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isEdit = !!initial?.id;
  const isArq  = !!initial?.arquivadaEm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!solicitante) { toast.error("Selecione um solicitante"); return; }
    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const url    = isEdit ? `/api/demandas/${initial.id}` : "/api/demandas";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solicitanteId: solicitante.id,
          titulo, descricao, status, segmento, prioridade,
          valor: valor !== "" ? parseFloat(valor) : null,
          obs,
          lembrete: lembrete || null,
          prazo: prazo || null,
          conversaId: conversaId ?? initial?.conversaId ?? null,
          fechadaEm: cfg.statuses.find(s => s.key === status)?.isClosed ? (initial?.fechadaEm ?? new Date().toISOString()) : null,
        }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success(isEdit ? "Demanda atualizada!" : "Demanda criada!");
      onSave(await r.json());
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm("Excluir esta demanda?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/demandas/${initial.id}`, { method: "DELETE" });
      toast.success("Demanda excluída"); onDelete?.();
    } finally { setDeleting(false); }
  }

  async function toggleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/demandas/${initial.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivadaEm: isArq ? null : new Date().toISOString() }),
      });
      toast.success(isArq ? "Demanda reaberta" : "Demanda arquivada");
      onArchive?.();
    } finally { setArchiving(false); }
  }

  const abertaEm  = initial?.createdAt ? format(new Date(initial.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;
  const fechadaEm = initial?.fechadaEm ? format(new Date(initial.fechadaEm), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {isEdit && (
        <div className="flex gap-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          <span>Aberto: <strong className="text-gray-600">{abertaEm ?? "—"}</strong></span>
          <span>Fechado: <strong className="text-gray-600">{fechadaEm ?? "—"}</strong></span>
          {isArq && <span className="text-amber-600 font-medium">Arquivada</span>}
        </div>
      )}

      {/* Status visual — somente edit */}
      {isEdit && cfg.statuses.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {cfg.statuses.map(s => (
              <button key={s.key} type="button" onClick={() => setStatus(s.key)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${status === s.key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                style={status === s.key ? { backgroundColor: s.color, borderColor: s.color } : {}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante *</label>
        {solicitante ? (
          <div className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
              {solicitante.name?.[0]?.toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium text-indigo-900 truncate">{solicitante.name}</span>
            {solicitante.role && <RoleBadge role={solicitante.role} />}
            <button type="button" onClick={() => setSolicitante(null)} className="text-indigo-300 hover:text-red-400 ml-1"><X size={14} /></button>
          </div>
        ) : <ContactSearch onSelect={setSolicitante} />}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">O que *</label>
        <input required value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Descreva a demanda brevemente..." className={INP} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
          <select value={segmento} onChange={e => setSegmento(e.target.value)} className={`${INP} bg-white`}>
            <option value="">Sem segmento</option>
            {cfg.segmentos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
          <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className={`${INP} bg-white`}>
            {cfg.prioridades.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={INP} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1"><CalendarClock size={13} /> Prazo</span>
          </label>
          <input type="datetime-local" value={prazo} onChange={e => setPrazo(e.target.value)} className={INP} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-1.5"><Bell size={13} className="text-amber-500" /> Lembrete</span>
        </label>
        <input type="datetime-local" value={lembrete} onChange={e => setLembrete(e.target.value)} className={INP} />
        <p className="text-xs text-gray-400 mt-1">Aparecerá um sinalizador no card quando a data chegar</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
            placeholder="Detalhes..." className={`${INP} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Obs</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
            placeholder="Observações..." className={`${INP} resize-none`} />
        </div>
      </div>

      {(conversaId || initial?.conversaId) && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
          <LinkIcon size={12} /> Vinculada a uma conversa
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {isEdit && onArchive && (
            <button type="button" onClick={toggleArchive} disabled={archiving}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors ${isArq ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"}`}>
              {isArq ? <><ArchiveRestore size={13} /> Reabrir</> : <><Archive size={13} /> Arquivar</>}
            </button>
          )}
          {isEdit && onDelete && (
            <button type="button" onClick={del} disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              <Trash2 size={13} /> {deleting ? "Excluindo..." : "Excluir"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── DemandaCard (Kanban) ─────────────────────────────────────────────────────

function DemandaCard({ demanda, index, onClick, cfg }: { demanda: any; index: number; onClick: () => void; cfg: DemandaCfg }) {
  const p    = prio(cfg.prioridades, demanda.prioridade);
  const now  = new Date();
  const hasRem = demanda.lembrete && new Date(demanda.lembrete) <= now;
  const isOver = demanda.prazo && new Date(demanda.prazo) < now;

  return (
    <Draggable draggableId={demanda.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow border-l-[3px] ${snapshot.isDragging ? "shadow-lg opacity-90" : ""}`}
          style={{ ...provided.draggableProps.style, borderLeftColor: borderColor(p) }}
        >
          <div className="flex items-start gap-1.5 mb-2">
            <p className="font-medium text-gray-900 text-sm leading-snug flex-1 line-clamp-2">{demanda.titulo}</p>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {hasRem && <Bell size={13} className="text-amber-500" title="Lembrete!" />}
              {demanda.conversa && <LinkIcon size={11} className="text-indigo-400" />}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <User size={11} className="shrink-0" />
            <span className="truncate">{demanda.solicitante?.name}</span>
            {demanda.solicitante?.role && <RoleBadge role={demanda.solicitante.role} />}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: p.color, backgroundColor: p.bgColor }}>{p.label}</span>
            {demanda.segmento && <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{demanda.segmento}</span>}
            {demanda.prazo && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${isOver ? "bg-red-50 text-red-600 font-medium" : "bg-gray-50 text-gray-400"}`}>
                {isOver && "⚠ "}{format(new Date(demanda.prazo), "dd/MM", { locale: ptBR })}
              </span>
            )}
            {demanda.valor != null && (
              <span className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                R$ {Number(demanda.valor).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Lista View ───────────────────────────────────────────────────────────────

function ListaView({ demandas, cfg, onEdit }: { demandas: any[]; cfg: DemandaCfg; onEdit: (d: any) => void }) {
  const [sortBy, setSortBy]   = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir(v => v === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  }

  const sorted = [...demandas].sort((a, b) => {
    let av: any, bv: any;
    if      (sortBy === "titulo")    { av = a.titulo; bv = b.titulo; }
    else if (sortBy === "status")    { av = a.status; bv = b.status; }
    else if (sortBy === "prioridade") {
      av = cfg.prioridades.findIndex(p => p.key === a.prioridade);
      bv = cfg.prioridades.findIndex(p => p.key === b.prioridade);
    }
    else if (sortBy === "prazo")    { av = a.prazo   ?? "z"; bv = b.prazo   ?? "z"; }
    else if (sortBy === "lembrete") { av = a.lembrete ?? "z"; bv = b.lembrete ?? "z"; }
    else                            { av = a.createdAt; bv = b.createdAt; }
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function Th({ field, label }: { field: string; label: string }) {
    return (
      <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5 cursor-pointer hover:text-gray-700 whitespace-nowrap select-none"
        onClick={() => toggleSort(field)}>
        {label} {sortBy === field && (sortDir === "asc" ? "↑" : "↓")}
      </th>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <Th field="titulo"     label="Título" />
            <Th field="status"     label="Status" />
            <Th field="prioridade" label="Prioridade" />
            <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Solicitante</th>
            <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Segmento</th>
            <Th field="prazo"     label="Prazo" />
            <Th field="lembrete"  label="Lembrete" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.length === 0 && (
            <tr><td colSpan={7} className="text-center text-gray-400 text-sm py-10">Nenhuma demanda</td></tr>
          )}
          {sorted.map(d => {
            const p    = prio(cfg.prioridades, d.prioridade);
            const st   = cfg.statuses.find(s => s.key === d.status);
            const now  = new Date();
            const isOver = d.prazo    && new Date(d.prazo)    < now;
            const hasRem = d.lembrete && new Date(d.lembrete) <= now;
            return (
              <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(d)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: borderColor(p) }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{d.titulo}</p>
                      {d.conversa && <LinkIcon size={11} className="text-indigo-400 inline ml-1" />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {st && <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: st.color }}>{st.label}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: p.color, backgroundColor: p.bgColor }}>{p.label}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 truncate max-w-[130px]">{d.solicitante?.name}</span>
                    {d.solicitante?.role && <RoleBadge role={d.solicitante.role} />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{d.segmento ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  {d.prazo ? (
                    <span className={`text-xs ${isOver ? "text-red-600 font-medium" : "text-gray-500"}`}>
                      {isOver && "⚠ "}{format(new Date(d.prazo), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {d.lembrete ? (
                    <span className={`flex items-center gap-1 text-xs ${hasRem ? "text-amber-600 font-medium" : "text-gray-500"}`}>
                      {hasRem && <Bell size={11} />}
                      {format(new Date(d.lembrete), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lembretes View ───────────────────────────────────────────────────────────

function LembretesView({ demandas, cfg, onEdit }: { demandas: any[]; cfg: DemandaCfg; onEdit: (d: any) => void }) {
  const now   = new Date();
  const today = format(now, "yyyy-MM-dd");

  const sorted = [...demandas].sort((a, b) => new Date(a.lembrete).getTime() - new Date(b.lembrete).getTime());
  const atrasados = sorted.filter(d => format(new Date(d.lembrete), "yyyy-MM-dd") < today);
  const hoje      = sorted.filter(d => format(new Date(d.lembrete), "yyyy-MM-dd") === today);
  const proximos  = sorted.filter(d => format(new Date(d.lembrete), "yyyy-MM-dd") > today);

  function LemCard({ d, accent }: { d: any; accent: string }) {
    const p  = prio(cfg.prioridades, d.prioridade);
    const st = cfg.statuses.find(s => s.key === d.status);
    return (
      <div onClick={() => onEdit(d)}
        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:shadow-sm transition-shadow">
        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{d.titulo}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400">{d.solicitante?.name}</span>
            {st && <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: st.color }}>{st.label}</span>}
          </div>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-sm font-bold" style={{ color: accent }}>
            {format(new Date(d.lembrete), "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-gray-400">{format(new Date(d.lembrete), "HH:mm")}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ color: p.color, backgroundColor: p.bgColor }}>
          {p.label}
        </span>
      </div>
    );
  }

  function Section({ title, items, accent, empty }: { title: string; items: any[]; accent: string; empty: string }) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{items.length}</span>
        </div>
        {items.length === 0
          ? <p className="text-xs text-gray-400 italic pl-5 mb-2">{empty}</p>
          : <div className="flex flex-col gap-2">{items.map(d => <LemCard key={d.id} d={d} accent={accent} />)}</div>
        }
      </div>
    );
  }

  if (demandas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Bell size={32} className="mb-3 opacity-30" />
        <p className="font-medium">Nenhum lembrete definido</p>
        <p className="text-sm mt-1">Adicione um lembrete ao criar ou editar uma demanda</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Section title="Atrasados" items={atrasados} accent="#ef4444" empty="Nenhum lembrete atrasado" />
      <Section title="Hoje"      items={hoje}      accent="#f59e0b" empty="Nenhum lembrete para hoje" />
      <Section title="Próximos"  items={proximos}  accent="#3b82f6" empty="Nenhum lembrete futuro" />
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const EMPTY_CFG: DemandaCfg = { statuses: [], prioridades: [], segmentos: [] };

export default function DemandasPage() {
  const [demandas, setDemandas]   = useState<any[]>([]);
  const [cfg, setCfg]             = useState<DemandaCfg>(EMPTY_CFG);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"kanban" | "lista" | "lembretes">("kanban");
  const [modal, setModal]         = useState<"nova" | "editar" | null>(null);
  const [selected, setSelected]   = useState<any | null>(null);
  const [search, setSearch]       = useState("");
  const [filterSeg, setFilterSeg] = useState("");
  const [filterPrio, setFilterPrio] = useState("");
  const [showArq, setShowArq]     = useState(false);
  const [preContact, setPreContact] = useState<any | null>(null);
  const [preConvId, setPreConvId]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demandas/config").then(r => r.json()).then(setCfg);
    const params = new URLSearchParams(window.location.search);
    const cId = params.get("contactId");
    const convId = params.get("conversaId");
    if (cId) {
      setPreConvId(convId);
      fetch(`/api/contacts/${cId}`).then(r => r.json()).then(c => { setPreContact(c); setModal("nova"); });
      window.history.replaceState({}, "", "/demandas");
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const p = new URLSearchParams();
      if (showArq)    p.set("arquivadas", "true");
      if (view === "lembretes") {
        p.set("hasLembrete", "true");
      } else {
        if (search)     p.set("search", search);
        if (filterSeg)  p.set("segmento", filterSeg);
        if (filterPrio) p.set("prioridade", filterPrio);
      }
      const r = await fetch(`/api/demandas?${p}`);
      setDemandas(await r.json());
    } finally { if (!silent) setLoading(false); }
  }, [view, showArq, search, filterSeg, filterPrio]);

  useEffect(() => { load(); }, [load]);

  // SSE: recarrega silenciosamente quando outro usuário muta demandas (sem spinner)
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("demandas", () => load(true));
    return () => es.close();
  }, [load]);

  const columns = cfg.statuses
    .slice().sort((a, b) => a.position - b.position)
    .map(col => ({
      ...col,
      demandas: demandas
        .filter(d => d.status === col.key)
        .sort((a, b) => cfg.prioridades.findIndex(p => p.key === a.prioridade) - cfg.prioridades.findIndex(p => p.key === b.prioridade)),
    }));

  const remCount = demandas.filter(d => d.lembrete && new Date(d.lembrete) <= new Date()).length;

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    const isClosed  = cfg.statuses.find(s => s.key === newStatus)?.isClosed ?? false;
    setDemandas(prev => prev.map(d => d.id === draggableId ? { ...d, status: newStatus } : d));
    await fetch(`/api/demandas/${draggableId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, fechadaEm: isClosed ? new Date().toISOString() : null }),
    });
  }

  function closeModal() { setModal(null); setSelected(null); setPreContact(null); setPreConvId(null); }

  const VIEW_TABS = [
    { key: "kanban",    label: "Kanban",    icon: LayoutDashboard },
    { key: "lista",     label: "Lista",     icon: List },
    { key: "lembretes", label: "Lembretes", icon: AlarmClock },
  ] as const;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demandas</h1>
          <p className="text-sm text-gray-500">{demandas.length} {showArq ? "arquivadas" : "abertas"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArq(v => !v)} title={showArq ? "Ver abertas" : "Ver arquivadas"}
            className={`p-2 rounded-lg border transition-colors ${showArq ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
            {showArq ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </button>
          <button onClick={() => { setSelected(null); setModal("nova"); }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Nova Demanda
          </button>
        </div>
      </header>

      {/* Toolbar: views + filtros */}
      <div className="flex items-center gap-3 px-6 py-2 bg-white border-b border-gray-100 shrink-0">
        {/* View tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {VIEW_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setView(key)}
              className={`relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${view === key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon size={13} /> {label}
              {key === "lembretes" && remCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">{remCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filtros (ocultos no mode lembretes) */}
        {view !== "lembretes" && (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-40" />
            </div>
            {cfg.segmentos.length > 0 && (
              <select value={filterSeg} onChange={e => setFilterSeg(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
                <option value="">Segmento</option>
                {cfg.segmentos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {cfg.prioridades.length > 0 && (
              <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
                <option value="">Prioridade</option>
                {cfg.prioridades.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            )}
            {(search || filterSeg || filterPrio) && (
              <button onClick={() => { setSearch(""); setFilterSeg(""); setFilterPrio(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">Limpar</button>
            )}
          </>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "kanban" ? (
          showArq ? (
            /* Lista simples de arquivadas */
            <div className="p-6">
              {demandas.length === 0 ? (
                <p className="text-center text-gray-400 text-sm pt-10">Nenhuma demanda arquivada</p>
              ) : (
                <div className="max-w-2xl flex flex-col gap-2">
                  {demandas.map(d => {
                    const p = prio(cfg.prioridades, d.prioridade);
                    return (
                      <div key={d.id} onClick={() => { setSelected(d); setModal("editar"); }}
                        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{d.titulo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{d.solicitante?.name}</p>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: p.color, backgroundColor: p.bgColor }}>{p.label}</span>
                        <span className="text-xs text-gray-400">{format(new Date(d.arquivadaEm), "dd/MM/yy", { locale: ptBR })}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 p-6 h-full overflow-x-auto items-start">
                {columns.map(col => (
                  <div key={col.key} className="kanban-column flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="font-semibold text-sm text-gray-700">{col.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full font-medium">{col.demandas.length}</span>
                    </div>
                    <Droppable droppableId={col.key}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`min-h-[80px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-brand-50" : ""}`}>
                          {col.demandas.map((d, i) => (
                            <DemandaCard key={d.id} demanda={d} index={i} cfg={cfg}
                              onClick={() => { setSelected(d); setModal("editar"); }} />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )
        ) : view === "lista" ? (
          <div className="p-6">
            <ListaView demandas={demandas} cfg={cfg} onEdit={d => { setSelected(d); setModal("editar"); }} />
          </div>
        ) : (
          <div className="p-6">
            <LembretesView demandas={demandas} cfg={cfg} onEdit={d => { setSelected(d); setModal("editar"); }} />
          </div>
        )}
      </div>

      <Modal open={modal === "nova"} onClose={closeModal} title="Nova Demanda" size="lg">
        <DemandaForm cfg={cfg} initialContact={preContact ?? undefined} conversaId={preConvId}
          onSave={() => { closeModal(); load(); }} onClose={closeModal} />
      </Modal>

      <Modal open={modal === "editar" && !!selected} onClose={closeModal} title="Demanda" size="lg">
        <DemandaForm cfg={cfg} initial={selected}
          onSave={d => { setDemandas(prev => prev.map(x => x.id === d.id ? d : x)); closeModal(); }}
          onClose={closeModal}
          onDelete={() => { setDemandas(prev => prev.filter(x => x.id !== selected?.id)); closeModal(); }}
          onArchive={() => { load(); closeModal(); }}
        />
      </Modal>
    </div>
  );
}
