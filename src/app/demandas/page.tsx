"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Bell, User, Search, X, Trash2, Link as LinkIcon, CalendarClock } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_COLS = [
  { key: "ANALISAR",     label: "Analisar",     color: "#6366f1" },
  { key: "EM_ANDAMENTO", label: "Em Andamento", color: "#f59e0b" },
  { key: "PENDENTE",     label: "Pendente",     color: "#f97316" },
  { key: "ATENDIDA",     label: "Atendida",     color: "#10b981" },
  { key: "NAO_ATENDIDA", label: "Não Atendida", color: "#ef4444" },
] as const;

const PRIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  URGENTE:    { label: "Urgente",    color: "#dc2626", bg: "#fee2e2", border: "#ef4444" },
  IMPORTANTE: { label: "Importante", color: "#ea580c", bg: "#ffedd5", border: "#f97316" },
  MEDIA:      { label: "Média",      color: "#2563eb", bg: "#dbeafe", border: "#3b82f6" },
  NORMAL:     { label: "Normal",     color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
};
const PRIO_ORDER = ["URGENTE", "IMPORTANTE", "MEDIA", "NORMAL"];
const SEGMENTOS  = ["Saúde", "Esporte", "Ação"];
const CLOSED     = ["ATENDIDA", "NAO_ATENDIDA"];

function sortByPrio(a: any, b: any) {
  return PRIO_ORDER.indexOf(a.prioridade) - PRIO_ORDER.indexOf(b.prioridade);
}

// ─── ContactSearch ────────────────────────────────────────────────────────────

function ContactSearch({ onSelect }: { onSelect: (c: any) => void }) {
  const [q, setQ]           = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen]     = useState(false);
  const debounce = useRef<NodeJS.Timeout>();
  const ref      = useRef<HTMLDivElement>(null);

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

function DemandaForm({ initial, initialContact, conversaId, onSave, onClose, onDelete }: {
  initial?: any; initialContact?: any;
  conversaId?: string | null;
  onSave: (d: any) => void; onClose: () => void; onDelete?: () => void;
}) {
  const [solicitante, setSolicitante] = useState<any | null>(initial?.solicitante ?? initialContact ?? null);
  const [titulo,      setTitulo]      = useState(initial?.titulo    ?? "");
  const [descricao,   setDescricao]   = useState(initial?.descricao ?? "");
  const [status,      setStatus]      = useState(initial?.status    ?? "ANALISAR");
  const [segmento,    setSegmento]    = useState(initial?.segmento  ?? "");
  const [prioridade,  setPrioridade]  = useState(initial?.prioridade ?? "NORMAL");
  const [valor,       setValor]       = useState(initial?.valor != null ? String(initial.valor) : "");
  const [obs,         setObs]         = useState(initial?.obs        ?? "");
  const [lembrete,    setLembrete]    = useState(initial?.lembrete ? initial.lembrete.slice(0, 16) : "");
  const [prazo,       setPrazo]       = useState(initial?.prazo     ? initial.prazo.slice(0, 16) : "");
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initial?.id;

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
        }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      const d = await r.json();
      toast.success(isEdit ? "Demanda atualizada!" : "Demanda criada!");
      onSave(d);
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm("Excluir esta demanda?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/demandas/${initial.id}`, { method: "DELETE" });
      toast.success("Demanda excluída");
      onDelete?.();
    } finally { setDeleting(false); }
  }

  const abertaEm = initial?.createdAt ? format(new Date(initial.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;
  const fechadaEm = initial?.fechadaEm ? format(new Date(initial.fechadaEm), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">

      {/* Datas (somente na edição) */}
      {isEdit && (
        <div className="flex gap-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          <span>Aberto: <strong className="text-gray-600">{abertaEm ?? "—"}</strong></span>
          <span>Fechado: <strong className="text-gray-600">{fechadaEm ?? "—"}</strong></span>
        </div>
      )}

      {/* Solicitante */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante *</label>
        {solicitante ? (
          <div className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
              {solicitante.name?.[0]?.toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium text-indigo-900 truncate">{solicitante.name}</span>
            {solicitante.role && <RoleBadge role={solicitante.role} />}
            <button type="button" onClick={() => setSolicitante(null)} className="text-indigo-300 hover:text-red-400 ml-1">
              <X size={14} />
            </button>
          </div>
        ) : (
          <ContactSearch onSelect={setSolicitante} />
        )}
      </div>

      {/* O que */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">O que *</label>
        <input required value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Descreva a demanda brevemente..." className={INP} />
      </div>

      {/* Status (edit only) + Prioridade */}
      <div className="grid grid-cols-2 gap-3">
        {isEdit ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={`${INP} bg-white`}>
              {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
            <select value={segmento} onChange={e => setSegmento(e.target.value)} className={`${INP} bg-white`}>
              <option value="">Sem segmento</option>
              {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
          <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className={`${INP} bg-white`}>
            {PRIO_ORDER.map(p => <option key={p} value={p}>{PRIO[p].label}</option>)}
          </select>
        </div>
      </div>

      {/* Segmento (edit only, já mostrado em create acima) */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
          <select value={segmento} onChange={e => setSegmento(e.target.value)} className={`${INP} bg-white`}>
            <option value="">Sem segmento</option>
            {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Valor + Prazo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
            placeholder="0,00" className={INP} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1"><CalendarClock size={13} /> Prazo</span>
          </label>
          <input type="datetime-local" value={prazo} onChange={e => setPrazo(e.target.value)} className={INP} />
        </div>
      </div>

      {/* Lembrete */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-1.5"><Bell size={13} className="text-amber-500" /> Lembrete</span>
        </label>
        <input type="datetime-local" value={lembrete} onChange={e => setLembrete(e.target.value)} className={INP} />
        <p className="text-xs text-gray-400 mt-1">Aparecerá um sinalizador no card quando a data chegar</p>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
          placeholder="Detalhes adicionais..." className={`${INP} resize-none`} />
      </div>

      {/* Obs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Obs</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
          placeholder="Observações internas..." className={`${INP} resize-none`} />
      </div>

      {/* Conversa vinculada */}
      {(conversaId || initial?.conversaId) && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
          <LinkIcon size={12} /> Vinculada a uma conversa
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {isEdit && onDelete ? (
          <button type="button" onClick={del} disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
            <Trash2 size={14} /> {deleting ? "Excluindo..." : "Excluir"}
          </button>
        ) : <div />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button disabled={saving}
            className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── DemandaCard ──────────────────────────────────────────────────────────────

function DemandaCard({ demanda, index, onClick }: { demanda: any; index: number; onClick: () => void }) {
  const prio    = PRIO[demanda.prioridade] ?? PRIO.NORMAL;
  const now     = new Date();
  const hasRem  = demanda.lembrete && new Date(demanda.lembrete) <= now && !CLOSED.includes(demanda.status);
  const isOver  = demanda.prazo && new Date(demanda.prazo) < now && !CLOSED.includes(demanda.status);

  return (
    <Draggable draggableId={demanda.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow border-l-[3px] ${snapshot.isDragging ? "shadow-lg opacity-90" : ""}`}
          style={{ ...provided.draggableProps.style, borderLeftColor: prio.border }}
        >
          {/* Título + indicadores */}
          <div className="flex items-start gap-1.5 mb-2">
            <p className="font-medium text-gray-900 text-sm leading-snug flex-1 line-clamp-2">{demanda.titulo}</p>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {hasRem && <Bell size={13} className="text-amber-500" title="Lembrete!" />}
              {demanda.conversa && <LinkIcon size={11} className="text-indigo-400" title="Vinculada a conversa" />}
            </div>
          </div>

          {/* Solicitante */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <User size={11} className="shrink-0" />
            <span className="truncate">{demanda.solicitante?.name}</span>
            {demanda.solicitante?.role && <RoleBadge role={demanda.solicitante.role} />}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: prio.color, backgroundColor: prio.bg }}>
              {prio.label}
            </span>
            {demanda.segmento && (
              <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{demanda.segmento}</span>
            )}
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DemandasPage() {
  const [demandas, setDemandas]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<"nova" | "editar" | null>(null);
  const [selected, setSelected]     = useState<any | null>(null);
  const [search, setSearch]         = useState("");
  const [filterSeg, setFilterSeg]   = useState("");
  const [filterPrio, setFilterPrio] = useState("");
  const [filterRem, setFilterRem]   = useState(false);

  // Pre-fill quando vem de conversas
  const [preContact,  setPreContact]  = useState<any | null>(null);
  const [preConvId,   setPreConvId]   = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cId    = params.get("contactId");
    const convId = params.get("conversaId");
    if (cId) {
      setPreConvId(convId);
      fetch(`/api/contacts/${cId}`).then(r => r.json()).then(c => {
        setPreContact(c);
        setModal("nova");
      });
      window.history.replaceState({}, "", "/demandas");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)    p.set("search", search);
      if (filterSeg) p.set("segmento", filterSeg);
      if (filterPrio) p.set("prioridade", filterPrio);
      if (filterRem) p.set("lembrete", "hoje");
      const r = await fetch(`/api/demandas?${p}`);
      setDemandas(await r.json());
    } finally { setLoading(false); }
  }, [search, filterSeg, filterPrio, filterRem]);

  useEffect(() => { load(); }, [load]);

  const columns = STATUS_COLS.map(col => ({
    ...col,
    demandas: demandas.filter(d => d.status === col.key).sort(sortByPrio),
  }));

  const remCount = demandas.filter(d => d.lembrete && new Date(d.lembrete) <= new Date() && !CLOSED.includes(d.status)).length;
  const total    = demandas.length;
  const fechadas = demandas.filter(d => CLOSED.includes(d.status)).length;

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    setDemandas(prev => prev.map(d => d.id === draggableId ? { ...d, status: newStatus } : d));

    await fetch(`/api/demandas/${draggableId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        fechadaEm: CLOSED.includes(newStatus) ? new Date().toISOString() : null,
      }),
    });
  }

  function openEdit(d: any) { setSelected(d); setModal("editar"); }

  function closeModal() {
    setModal(null); setSelected(null); setPreContact(null); setPreConvId(null);
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demandas</h1>
          <p className="text-sm text-gray-500">{total} total · {fechadas} fechadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterRem(v => !v)}
            title={filterRem ? "Mostrar todas" : "Filtrar lembretes de hoje"}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${filterRem ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Bell size={14} />
            {remCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                {remCount}
              </span>
            )}
          </button>
          <button onClick={() => { setSelected(null); setModal("nova"); }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Nova Demanda
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-44" />
        </div>
        <select value={filterSeg} onChange={e => setFilterSeg(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">Todos os segmentos</option>
          {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">Todas as prioridades</option>
          {PRIO_ORDER.map(p => <option key={p} value={p}>{PRIO[p].label}</option>)}
        </select>
        {(search || filterSeg || filterPrio) && (
          <button onClick={() => { setSearch(""); setFilterSeg(""); setFilterPrio(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
            Limpar
          </button>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 p-6 h-full overflow-x-auto items-start">
              {columns.map(col => (
                <div key={col.key} className="kanban-column flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="font-semibold text-sm text-gray-700">{col.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full font-medium">
                      {col.demandas.length}
                    </span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`min-h-[80px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-brand-50" : ""}`}>
                        {col.demandas.map((d, i) => (
                          <DemandaCard key={d.id} demanda={d} index={i} onClick={() => openEdit(d)} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Modal Nova */}
      <Modal open={modal === "nova"} onClose={closeModal} title="Nova Demanda" size="lg">
        <DemandaForm
          initialContact={preContact ?? undefined}
          conversaId={preConvId}
          onSave={() => { closeModal(); load(); }}
          onClose={closeModal}
        />
      </Modal>

      {/* Modal Editar */}
      <Modal open={modal === "editar" && !!selected} onClose={closeModal} title="Demanda" size="lg">
        <DemandaForm
          initial={selected}
          onSave={d => { setDemandas(prev => prev.map(x => x.id === d.id ? d : x)); closeModal(); }}
          onClose={closeModal}
          onDelete={() => { setDemandas(prev => prev.filter(x => x.id !== selected?.id)); closeModal(); }}
        />
      </Modal>
    </div>
  );
}
