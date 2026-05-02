"use client";
import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Calendar, AlertCircle, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

type Status = { key: string; label: string; color: string; isClosed?: boolean };
type Prioridade = { key: string; label: string; color: string; bgColor: string };

function StatusBadge({ status, statuses }: { status: string; statuses: Status[] }) {
  const s = statuses.find(x => x.key === status);
  if (!s) return <span className="text-[10px] text-gray-400">{status}</span>;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: s.color, backgroundColor: s.color + "22" }}>
      {s.label}
    </span>
  );
}

function PrioBadge({ prio, prios }: { prio: string; prios: Prioridade[] }) {
  const p = prios.find(x => x.key === prio);
  if (!p) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: p.color, backgroundColor: p.bgColor }}>
      {p.label}
    </span>
  );
}

function NewDemandaModal({ contactId, contactName, conversaId, cfg, onClose, onCreated }: any) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState(cfg.prioridades?.find((p: any) => p.key === "NORMAL")?.key ?? cfg.prioridades?.[cfg.prioridades.length - 1]?.key ?? "");
  const [segmento, setSegmento] = useState("");
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { toast.error("Título obrigatório"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/demandas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solicitanteId: contactId,
          titulo, descricao,
          prioridade,
          segmento: segmento || null,
          prazo: prazo || null,
          conversaId: conversaId ?? null,
        }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Demanda criada");
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open title={`Nova demanda para ${contactName}`} onClose={onClose} size="md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
          <input required value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prioridade</label>
            <select value={prioridade} onChange={e => setPrioridade(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {cfg.prioridades?.map((p: Prioridade) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Segmento</label>
            <select value={segmento} onChange={e => setSegmento(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">—</option>
              {(cfg.segmentos ?? []).map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prazo (opcional)</label>
          <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <ClipboardList size={14} /> {saving ? "Criando..." : "Criar demanda"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DemandaDetailModal({ demanda, cfg, onClose }: any) {
  const status = cfg.statuses?.find((s: Status) => s.key === demanda.status);
  const prio   = cfg.prioridades?.find((p: Prioridade) => p.key === demanda.prioridade);

  return (
    <Modal open title={demanda.titulo} onClose={onClose} size="md">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {status && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: status.color, backgroundColor: status.color + "22" }}>{status.label}</span>}
          {prio && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: prio.color, backgroundColor: prio.bgColor }}>{prio.label}</span>}
          {demanda.segmento && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{demanda.segmento}</span>}
        </div>
        {demanda.descricao && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Descrição</p>
            <p className="text-gray-700 whitespace-pre-wrap">{demanda.descricao}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div>
            <p className="font-semibold uppercase mb-0.5">Criada em</p>
            <p>{format(new Date(demanda.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          {demanda.prazo && (
            <div>
              <p className="font-semibold uppercase mb-0.5">Prazo</p>
              <p className="flex items-center gap-1"><Calendar size={11} />{format(new Date(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          )}
          {demanda.lembrete && (
            <div>
              <p className="font-semibold uppercase mb-0.5">Lembrete</p>
              <p className="flex items-center gap-1"><AlertCircle size={11} />{format(new Date(demanda.lembrete), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          )}
          {demanda.fechadaEm && (
            <div>
              <p className="font-semibold uppercase mb-0.5">Fechada em</p>
              <p>{format(new Date(demanda.fechadaEm), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          )}
        </div>
        {demanda.obs && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observações</p>
            <p className="text-gray-700 whitespace-pre-wrap text-xs">{demanda.obs}</p>
          </div>
        )}
        <p className="text-[11px] text-gray-400 italic mt-2">Para editar ou alterar status, peça acesso ao módulo Demandas ao administrador.</p>
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Fechar</button>
        </div>
      </div>
    </Modal>
  );
}

export function DemandaInline({ contactId, contactName, conversaId, compact }: {
  contactId: string;
  contactName: string;
  conversaId?: string;
  compact?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any>({ statuses: [], prioridades: [], segmentos: [] });
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [picked, setPicked] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        fetch(`/api/demandas?solicitanteId=${contactId}`).then(r => r.json()),
        fetch("/api/demandas/config").then(r => r.json()),
      ]);
      setItems(d); setCfg(c);
    } finally { setLoading(false); }
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  // SSE pra atualizar quando demanda muda em outro lugar
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("demandas", () => load());
    return () => es.close();
  }, [load]);

  return (
    <>
      <button onClick={() => setShowNew(true)}
        title="Criar demanda para este contato"
        className={compact
          ? "flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600"
          : "flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 px-3 py-1.5 rounded-lg transition-colors"}>
        <ClipboardList size={compact ? 11 : 12} /> {compact ? "Nova" : "Nova demanda"}
      </button>

      {!compact && !loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {items.slice(0, 5).map(d => (
            <button key={d.id} onClick={() => setPicked(d)}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 hover:border-indigo-300 max-w-[180px]"
              title={d.titulo}>
              <span className="truncate text-gray-700">{d.titulo}</span>
              <StatusBadge status={d.status} statuses={cfg.statuses} />
            </button>
          ))}
          {items.length > 5 && (
            <span className="text-[10px] text-gray-400">+{items.length - 5}</span>
          )}
        </div>
      )}

      {showNew && (
        <NewDemandaModal
          contactId={contactId}
          contactName={contactName}
          conversaId={conversaId}
          cfg={cfg}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}
      {picked && <DemandaDetailModal demanda={picked} cfg={cfg} onClose={() => setPicked(null)} />}
    </>
  );
}
