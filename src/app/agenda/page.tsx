"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, List,
  LayoutGrid, Clock, MapPin, Users, X, Trash2,
  Home, FileText, Edit2,
} from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { format, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPOS: Record<string, { label: string; color: string; bg: string }> = {
  AGENDA:  { label: "Agenda",  color: "#4f46e5", bg: "#eef2ff" },
  REUNIAO: { label: "Reunião", color: "#059669", bg: "#ecfdf5" },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDENTE:   { label: "Pendente",   color: "#d97706", bg: "#fef3c7" },
  CONFIRMADA: { label: "Confirmada", color: "#059669", bg: "#d1fae5" },
  REALIZADA:  { label: "Realizada",  color: "#6b7280", bg: "#f3f4f6" },
  CANCELADA:  { label: "Cancelada",  color: "#dc2626", bg: "#fee2e2" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const START_HOUR = 7;
const END_HOUR   = 21;
const HOUR_PX    = 48;
const TOTAL_H    = HOUR_PX * (END_HOUR - START_HOUR);

// ─── Helpers de data ──────────────────────────────────────────────────────────

function isSameMonth(d: Date, ref: Date) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getWeekDays(ref: Date): Date[] {
  const d = new Date(ref);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(d);
    wd.setDate(d.getDate() + i);
    return wd;
  });
}

// Converte ISO UTC para string local (para datetime-local input)
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// ─── ContactSearch ────────────────────────────────────────────────────────────

function ContactSearch({ placeholder = "Buscar contato...", onSelect }: {
  placeholder?: string; onSelect: (c: any) => void;
}) {
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

  function pick(c: any) { onSelect(c); setQ(""); setOpen(false); setResults([]); }

  return (
    <div className="relative" ref={ref}>
      <input value={q} onChange={e => search(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {open && results.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
          {results.map(c => (
            <div key={c.id} onClick={() => pick(c)} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
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

// ─── EventForm ────────────────────────────────────────────────────────────────

const INP = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function EventForm({ initial, defaultDate, calendarios, onSave, onClose, onDelete }: {
  initial?: any; defaultDate?: Date; calendarios: any[];
  onSave: (e: any) => void; onClose: () => void; onDelete?: () => void;
}) {
  const [tipo,       setTipo]       = useState(initial?.tipo      ?? "AGENDA");
  const [titulo,     setTitulo]     = useState(initial?.titulo     ?? "");
  const [assunto,    setAssunto]    = useState(initial?.assunto    ?? "");
  const [status,     setStatus]     = useState(initial?.status     ?? "PENDENTE");
  const [calendarioId, setCalendarioId] = useState(
    initial?.calendarioId ?? calendarios.find(c => c.isPadrao)?.id ?? ""
  );
  const [inicio,     setInicio]     = useState(
    initial?.inicio   ? isoToLocal(initial.inicio)
    : defaultDate     ? format(defaultDate, "yyyy-MM-dd'T'08:00")
    : format(new Date(), "yyyy-MM-dd'T'08:00")
  );
  const [duracao,    setDuracao]    = useState(String(initial?.duracao  ?? 60));
  const [local,      setLocal]      = useState(initial?.local      ?? "");
  const [bairro,     setBairro]     = useState(initial?.bairro     ?? "");
  const [zona,       setZona]       = useState(initial?.zona       ?? "");
  const [qtdPessoas, setQtdPessoas] = useState(String(initial?.quantidadePessoas ?? ""));
  const [oQuePrecisa, setOQuePrecisa] = useState(initial?.oQuePrecisa ?? "");
  const [notes,      setNotes]      = useState(initial?.notes      ?? "");

  const [solicitanteMode, setSolicitanteMode] = useState<"base" | "manual">(
    initial?.solicitanteId ? "base" : "manual"
  );
  const [solicitante,  setSolicitante]  = useState<any | null>(initial?.solicitante ?? null);
  const [solNome,      setSolNome]      = useState(initial?.solicitanteNome ?? "");
  const [solTel,       setSolTel]       = useState(initial?.solicitanteTel  ?? "");

  const [anfitrioes,   setAnfitrioes]   = useState<any[]>(
    initial?.anfitrioes?.map((a: any) => a.contact) ?? []
  );
  const [demandas,     setDemandas]     = useState<any[]>([]);
  const [demandaId,    setDemandaId]    = useState(initial?.demandaId ?? "");

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const anfIds = anfitrioes.map(a => a.id).join(",");
  useEffect(() => {
    if (!anfIds) { setDemandas([]); return; }
    Promise.all(anfitrioes.map(a =>
      fetch(`/api/demandas?solicitanteId=${a.id}`).then(r => r.json())
    )).then(res => setDemandas(res.flat()));
  }, [anfIds]);

  function addAnfitriao(c: any) {
    if (!anfitrioes.find(a => a.id === c.id)) setAnfitrioes(prev => [...prev, c]);
  }

  async function checkConflicts(): Promise<any[]> {
    const startMs = new Date(inicio).getTime();
    const dur     = duracao ? parseInt(duracao) : 60;
    const endMs   = startMs + dur * 60000;
    const pad     = 4 * 3600000;
    const r = await fetch(`/api/agenda?start=${new Date(startMs - pad).toISOString()}&end=${new Date(endMs + pad).toISOString()}`);
    const all: any[] = await r.json();
    return all.filter(ev => {
      if (initial?.id && ev.id === initial.id) return false;
      const evStart = new Date(ev.inicio).getTime();
      const evEnd   = evStart + (ev.duracao ?? 60) * 60000;
      return startMs < evEnd && endMs > evStart;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { toast.error("Título obrigatório"); return; }

    const conflicts = await checkConflicts();
    if (conflicts.length > 0) {
      const nomes = conflicts.map(c => `• ${c.titulo} (${format(new Date(c.inicio), "HH:mm", { locale: ptBR })})`).join("\n");
      if (!confirm(`Conflito com ${conflicts.length} evento(s) no mesmo horário:\n${nomes}\n\nDeseja salvar mesmo assim?`)) return;
    }

    setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url    = initial?.id ? `/api/agenda/${initial.id}` : "/api/agenda";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo, assunto, tipo, status,
          inicio: new Date(inicio).toISOString(),
          duracao: duracao ? parseInt(duracao) : null,
          local, bairro, zona,
          quantidadePessoas: qtdPessoas ? parseInt(qtdPessoas) : null,
          oQuePrecisa, notes,
          calendarioId: calendarioId || null,
          solicitanteId:   solicitanteMode === "base" ? solicitante?.id ?? null : null,
          solicitanteNome: solicitanteMode === "manual" ? solNome || null : null,
          solicitanteTel:  solicitanteMode === "manual" ? solTel  || null : null,
          demandaId: demandaId || null,
          anfitriaoIds: anfitrioes.map(a => a.id),
        }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success(initial?.id ? "Evento atualizado!" : "Evento criado!");
      onSave(await r.json());
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm("Excluir este evento?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/agenda/${initial.id}`, { method: "DELETE" });
      toast.success("Evento excluído"); onDelete?.();
    } finally { setDeleting(false); }
  }

  const tipoColor = TIPOS[tipo]?.color ?? "#6366f1";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">

      {/* Tipo */}
      <div className="flex gap-2">
        {Object.entries(TIPOS).map(([key, cfg]) => (
          <button key={key} type="button" onClick={() => setTipo(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${tipo === key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-500"}`}
            style={tipo === key ? { backgroundColor: cfg.color } : {}}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <button key={key} type="button" onClick={() => setStatus(key)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${status === key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-500"}`}
            style={status === key ? { backgroundColor: cfg.color } : {}}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Calendário */}
      {calendarios.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Calendário</label>
          <select value={calendarioId} onChange={e => setCalendarioId(e.target.value)} className={`${INP} bg-white`}>
            <option value="">Sem calendário</option>
            {calendarios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}

      {/* Título + Assunto */}
      <div className="flex flex-col gap-2">
        <input required value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Título do evento *" className={INP} />
        <textarea value={assunto} onChange={e => setAssunto(e.target.value)} rows={2}
          placeholder="Assunto / descrição..." className={`${INP} resize-none`} />
      </div>

      {/* Quando */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1"><Clock size={11} className="inline mr-1" />Início (horário local)</label>
          <input type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)} className={INP} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Duração</label>
          <select value={duracao} onChange={e => setDuracao(e.target.value)} className={`${INP} bg-white`}>
            {[30,60,90,120,180,240].map(m => <option key={m} value={m}>{m < 60 ? `${m}min` : `${m/60}h${m%60?`${m%60}m`:""}`}</option>)}
          </select>
        </div>
      </div>

      {/* Local */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-500 mb-1"><MapPin size={11} className="inline mr-1" />Local</label>
          <input value={local} onChange={e => setLocal(e.target.value)} placeholder="Endereço ou nome" className={INP} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
          <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className={INP} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
          <select value={zona} onChange={e => setZona(e.target.value)} className={`${INP} bg-white`}>
            <option value="">—</option>
            <option value="Urbano">Urbano</option>
            <option value="Rural">Rural</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1"><Users size={11} className="inline mr-1" />Pessoas</label>
          <input type="number" min="1" value={qtdPessoas} onChange={e => setQtdPessoas(e.target.value)} placeholder="0" className={INP} />
        </div>
      </div>

      {/* Solicitante */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-500">Solicitante</label>
          <div className="flex gap-1">
            {(["base", "manual"] as const).map(m => (
              <button key={m} type="button" onClick={() => setSolicitanteMode(m)}
                className={`text-xs px-2 py-0.5 rounded-full border ${solicitanteMode === m ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200"}`}>
                {m === "base" ? "Na base" : "Não cadastrado"}
              </button>
            ))}
          </div>
        </div>
        {solicitanteMode === "base" ? (
          solicitante ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                {solicitante.name?.[0]?.toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium text-indigo-900">{solicitante.name}</span>
              {solicitante.role && <RoleBadge role={solicitante.role} />}
              <button type="button" onClick={() => setSolicitante(null)} className="text-indigo-300 hover:text-red-400"><X size={13} /></button>
            </div>
          ) : <ContactSearch placeholder="Buscar na base..." onSelect={setSolicitante} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input value={solNome} onChange={e => setSolNome(e.target.value)} placeholder="Nome" className={INP} />
            <input value={solTel}  onChange={e => setSolTel(e.target.value)}  placeholder="Telefone" className={INP} />
          </div>
        )}
      </div>

      {/* Anfitriões (REUNIAO) */}
      {tipo === "REUNIAO" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            <Home size={11} className="inline mr-1" />Anfitriões (pode ser casal)
          </label>
          <ContactSearch placeholder="Buscar anfitrião..." onSelect={addAnfitriao} />
          {anfitrioes.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              {anfitrioes.map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
                    {a.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-green-900">{a.name}</span>
                  {a.role && <RoleBadge role={a.role} />}
                  <button type="button" onClick={() => setAnfitrioes(prev => prev.filter(x => x.id !== a.id))}
                    className="text-green-300 hover:text-red-400"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          {demandas.length > 0 && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-1"><FileText size={11} className="inline mr-1" />Demanda vinculada</label>
              <select value={demandaId} onChange={e => setDemandaId(e.target.value)} className={`${INP} bg-white`}>
                <option value="">Sem demanda</option>
                {demandas.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* O que precisa + Notes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">O que precisa</label>
          <textarea value={oQuePrecisa} onChange={e => setOQuePrecisa(e.target.value)} rows={2}
            placeholder="Recursos necessários..." className={`${INP} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Notas..." className={`${INP} resize-none`} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {initial?.id && onDelete ? (
          <button type="button" onClick={del} disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg">
            <Trash2 size={13} /> {deleting ? "Excluindo..." : "Excluir"}
          </button>
        ) : <div />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button disabled={saving} className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: tipoColor }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── EventPill ────────────────────────────────────────────────────────────────

function EventPill({ evento, calendarios, onClick }: { evento: any; calendarios: any[]; onClick: () => void }) {
  const t   = TIPOS[evento.tipo] ?? TIPOS.AGENDA;
  const cal = calendarios.find(c => c.id === evento.calendarioId);
  const bg  = cal ? `${cal.cor}22` : t.bg;
  const col = cal ? cal.cor : t.color;
  const cancelled = evento.status === "CANCELADA";
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }}
      className={`rounded px-1 py-0.5 text-[11px] font-medium cursor-pointer truncate leading-tight ${cancelled ? "opacity-40 line-through" : ""}`}
      style={{ backgroundColor: bg, color: col, borderLeft: `2px solid ${col}` }}>
      <span className="opacity-80 mr-0.5">{format(new Date(evento.inicio), "HH:mm")}</span>
      {evento.titulo}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, calendarios, onDayClick, onEventClick }: {
  currentDate: Date; events: any[]; calendarios: any[];
  onDayClick: (d: Date) => void; onEventClick: (e: any) => void;
}) {
  const cells = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-auto" style={{ gridAutoRows: "minmax(70px, 1fr)" }}>
        {cells.map((cell, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.inicio), cell));
          const inMonth   = isSameMonth(cell, currentDate);
          const today     = isToday(cell);
          return (
            <div key={i} onClick={() => onDayClick(cell)}
              className={`border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${!inMonth ? "bg-gray-50/70" : ""}`}>
              <div className={`text-[11px] font-semibold mb-0.5 w-5 h-5 flex items-center justify-center rounded-full ${today ? "bg-brand-600 text-white" : inMonth ? "text-gray-700" : "text-gray-300"}`}>
                {cell.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventPill key={ev.id} evento={ev} calendarios={calendarios} onClick={() => onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ currentDate, events, calendarios, onEventClick, onSlotClick }: {
  currentDate: Date; events: any[]; calendarios: any[];
  onEventClick: (e: any) => void; onSlotClick: (d: Date) => void;
}) {
  const days  = getWeekDays(currentDate);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  function eventsForDay(day: Date) {
    return events.filter(e => isSameDay(new Date(e.inicio), day));
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="flex shrink-0 border-b border-gray-100">
        <div className="w-14 shrink-0" />
        {days.map((d, i) => (
          <div key={i} className="flex-1 text-center py-1.5 border-l border-gray-100 min-w-0">
            <p className="text-[10px] font-medium text-gray-400 uppercase">{WEEKDAYS[d.getDay()]}</p>
            <div className={`text-xs font-bold mx-auto w-6 h-6 flex items-center justify-center rounded-full ${isToday(d) ? "bg-brand-600 text-white" : "text-gray-700"}`}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: TOTAL_H }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0">
            {hours.map(h => (
              <div key={h} style={{ height: HOUR_PX }}
                className="flex items-start justify-end pr-2 pt-0.5 border-b border-gray-100">
                <span className="text-[10px] text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((day, di) => (
            <div key={di} className="flex-1 border-l border-gray-100 min-w-0"
              style={{ position: "relative", height: TOTAL_H }}>
              {/* Hour slots (clickable) */}
              {hours.map(h => (
                <div key={h}
                  style={{ position: "absolute", top: (h - START_HOUR) * HOUR_PX, left: 0, right: 0, height: HOUR_PX }}
                  className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => { const d = new Date(day); d.setHours(h, 0, 0, 0); onSlotClick(d); }}
                />
              ))}
              {/* Events */}
              {eventsForDay(day).map(ev => {
                const start   = new Date(ev.inicio);
                const minFrom = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                if (minFrom < 0 || minFrom >= (END_HOUR - START_HOUR) * 60) return null;
                const dur = ev.duracao ?? 60;
                const cal = calendarios.find(c => c.id === ev.calendarioId);
                const t   = TIPOS[ev.tipo] ?? TIPOS.AGENDA;
                const col = cal?.cor ?? t.color;
                const bg  = cal ? `${col}22` : t.bg;
                return (
                  <div key={ev.id} onClick={() => onEventClick(ev)}
                    style={{
                      position: "absolute",
                      top: `${(minFrom / 60) * HOUR_PX}px`,
                      height: `${Math.max(18, (dur / 60) * HOUR_PX - 2)}px`,
                      left: 2, right: 2,
                      backgroundColor: bg, color: col,
                      borderLeft: `3px solid ${col}`,
                    }}
                    className="rounded-md px-1.5 py-0.5 text-[11px] cursor-pointer z-10 overflow-hidden shadow-sm">
                    <p className="font-semibold truncate leading-tight">{ev.titulo}</p>
                    <p className="opacity-70 leading-none">{format(start, "HH:mm")}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Agenda (List) View ───────────────────────────────────────────────────────

function AgendaListView({ events, calendarios, onEventClick }: {
  events: any[]; calendarios: any[]; onEventClick: (e: any) => void;
}) {
  const sorted = [...events].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const grouped: Record<string, any[]> = {};
  for (const ev of sorted) {
    const key = format(new Date(ev.inicio), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }
  if (sorted.length === 0) return (
    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
      <CalendarDays size={36} className="mb-3 opacity-30" />
      <p className="font-medium">Nenhum evento neste período</p>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        {Object.entries(grouped).map(([dayKey, dayEvents]) => {
          const day = new Date(dayKey + "T12:00:00");
          return (
            <div key={dayKey}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 ${isToday(day) ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                  <span className="text-[9px] uppercase font-semibold leading-none">{format(day, "EEE", { locale: ptBR }).slice(0, 3)}</span>
                  <span className="text-sm font-bold leading-none">{day.getDate()}</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {dayEvents.map(ev => {
                  const t   = TIPOS[ev.tipo]       ?? TIPOS.AGENDA;
                  const st  = STATUS_CFG[ev.status] ?? STATUS_CFG.PENDENTE;
                  const cal = calendarios.find(c => c.id === ev.calendarioId);
                  const col = cal?.cor ?? t.color;
                  return (
                    <div key={ev.id} onClick={() => onEventClick(ev)}
                      className="flex items-start gap-2.5 bg-white border border-gray-100 rounded-xl p-2.5 cursor-pointer hover:shadow-sm transition-shadow">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: col }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-medium text-sm ${ev.status === "CANCELADA" ? "line-through opacity-50" : "text-gray-900"}`}>{ev.titulo}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: t.color, backgroundColor: t.bg }}>{t.label}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                          {cal && <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: col }}>{cal.nome}</span>}
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(ev.inicio), "HH:mm")}{ev.duracao ? ` · ${ev.duracao}min` : ""}</span>
                          {ev.local && <span className="flex items-center gap-1"><MapPin size={11} />{ev.local}{ev.bairro ? ` · ${ev.bairro}` : ""}</span>}
                          {ev.quantidadePessoas && <span className="flex items-center gap-1"><Users size={11} />{ev.quantidadePessoas}p</span>}
                        </div>
                        {ev.anfitrioes?.length > 0 && (
                          <p className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <Home size={11} />{ev.anfitrioes.map((a: any) => a.contact.name).join(" & ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

type ViewType = "mes" | "semana" | "agenda";

const VIEWS = [
  { key: "mes",    label: "Mês",    icon: LayoutGrid },
  { key: "semana", label: "Semana", icon: CalendarDays },
  { key: "agenda", label: "Lista",  icon: List },
] as const;

function getDateRange(view: ViewType, ref: Date) {
  if (view === "mes") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 41);
    return { start, end };
  }
  if (view === "semana") {
    const days = getWeekDays(ref);
    const end = new Date(days[6]);
    end.setHours(23, 59, 59);
    return { start: days[0], end };
  }
  const end = new Date(ref);
  end.setDate(ref.getDate() + 60);
  return { start: ref, end };
}

function navigate(view: ViewType, ref: Date, dir: -1 | 1): Date {
  if (view === "mes")    return dir > 0 ? addMonths(ref, 1) : subMonths(ref, 1);
  if (view === "semana") return dir > 0 ? addWeeks(ref, 1)  : subWeeks(ref, 1);
  const d = new Date(ref);
  d.setDate(d.getDate() + dir * 60);
  return d;
}

export default function AgendaPage() {
  const [view, setView]         = useState<ViewType>("mes");
  const [refDate, setRefDate]   = useState(new Date());
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [calendarios, setCalendarios]   = useState<any[]>([]);
  const [selectedCals, setSelectedCals] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<"novo" | "editar" | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Load calendários
  useEffect(() => {
    fetch("/api/agenda/calendarios").then(r => r.json()).then((cals: any[]) => {
      setCalendarios(cals);
      setSelectedCals(cals.map(c => c.id)); // all selected by default
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(view, refDate);
      const r = await fetch(`/api/agenda?start=${start.toISOString()}&end=${end.toISOString()}`);
      setAllEvents(await r.json());
    } finally { setLoading(false); }
  }, [view, refDate]);

  useEffect(() => { load(); }, [load]);

  // Filter events by selected calendars
  const events = selectedCals.length === 0 ? allEvents : allEvents.filter(ev =>
    !ev.calendarioId || selectedCals.includes(ev.calendarioId)
  );

  function openNew(date?: Date) { setSelected(null); setDefaultDate(date); setModal("novo"); }
  function openEdit(ev: any)    { setSelected(ev); setDefaultDate(undefined); setModal("editar"); }
  function closeModal()          { setModal(null); setSelected(null); }

  function toggleCal(id: string) {
    setSelectedCals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const dateLabel = view === "mes"
    ? format(refDate, "MMMM yyyy", { locale: ptBR })
    : view === "semana"
    ? (() => { const w = getWeekDays(refDate); return `${format(w[0], "dd MMM", { locale: ptBR })} – ${format(w[6], "dd MMM yyyy", { locale: ptBR })}`; })()
    : format(refDate, "MMMM yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500">{events.length} evento{events.length !== 1 ? "s" : ""} no período</p>
        </div>
        <button onClick={() => openNew()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Nova Agenda
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setView(key as ViewType)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${view === key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setRefDate(navigate(view, refDate, -1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={15} /></button>
            <button onClick={() => setRefDate(new Date())}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">Hoje</button>
            <button onClick={() => setRefDate(navigate(view, refDate, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight size={15} /></button>
          </div>
          <span className="text-sm font-semibold text-gray-700 capitalize">{dateLabel}</span>
        </div>
        {/* Calendários – filtro rápido */}
        <div className="flex items-center gap-3">
          {calendarios.map(cal => (
            <label key={cal.id} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={selectedCals.includes(cal.id)} onChange={() => toggleCal(cal.id)}
                className="w-3.5 h-3.5 rounded" style={{ accentColor: cal.cor }} />
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cal.cor }} />
              <span className="text-xs text-gray-600">{cal.nome}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center flex-1">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "mes" ? (
          <MonthView currentDate={refDate} events={events} calendarios={calendarios} onDayClick={openNew} onEventClick={openEdit} />
        ) : view === "semana" ? (
          <WeekView currentDate={refDate} events={events} calendarios={calendarios} onEventClick={openEdit} onSlotClick={d => openNew(d)} />
        ) : (
          <AgendaListView events={events} calendarios={calendarios} onEventClick={openEdit} />
        )}
      </div>

      {/* Modal */}
      <Modal open={modal !== null} onClose={closeModal}
        title={modal === "editar" ? "Editar evento" : "Nova Agenda"} size="xl">
        <EventForm
          initial={modal === "editar" ? selected : undefined}
          defaultDate={defaultDate}
          calendarios={calendarios}
          onSave={() => { closeModal(); load(); }}
          onClose={closeModal}
          onDelete={modal === "editar" ? () => { load(); closeModal(); } : undefined}
        />
      </Modal>
    </div>
  );
}
