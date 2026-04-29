"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { type PersonRole } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

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
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome da coluna *</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Em Negociação" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cargo *</label>
        <input required value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label>
        <ColorPicker value={bgColor} onChange={setBgColor} />
      </div>
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
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, bgColor }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Etiqueta salva!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Interessado"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label>
        <ColorPicker value={bgColor} onChange={setBgColor} />
      </div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500">Prévia:</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: bgColor }}>
          {name || "Etiqueta"}
        </span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

// ─── Mini editor de lista (para status/prio/segmento de demandas) ─────────────

function toKey(label: string) {
  return label.toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function DemandaStatusSection({ cfg, onChange }: {
  cfg: { statuses: any[]; prioridades: any[]; segmentos: any[] };
  onChange: (patch: any) => void;
}) {
  const [newLabel, setNewLabel]   = useState("");
  const [newColor, setNewColor]   = useState("#6366f1");
  const [editIdx,  setEditIdx]    = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editClose, setEditClose] = useState(false);

  function addStatus() {
    if (!newLabel.trim()) return;
    const key  = toKey(newLabel);
    if (cfg.statuses.find(s => s.key === key)) { alert("Chave já existe"); return; }
    const next = [...cfg.statuses, { key, label: newLabel.trim(), color: newColor, isClosed: false, position: cfg.statuses.length }];
    onChange({ demanda_statuses: next });
    setNewLabel(""); setNewColor("#6366f1");
  }

  function startEdit(i: number) {
    const s = cfg.statuses[i];
    setEditIdx(i); setEditLabel(s.label); setEditColor(s.color); setEditClose(s.isClosed);
  }

  function saveEdit() {
    if (editIdx === null) return;
    const next = cfg.statuses.map((s, i) => i === editIdx ? { ...s, label: editLabel, color: editColor, isClosed: editClose } : s);
    onChange({ demanda_statuses: next }); setEditIdx(null);
  }

  function delStatus(i: number) {
    onChange({ demanda_statuses: cfg.statuses.filter((_, j) => j !== i) });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div><h2 className="font-semibold text-gray-900">Status de Demandas</h2><p className="text-sm text-gray-500 mt-0.5">Colunas do kanban de demandas</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-3">
        {cfg.statuses.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">Nenhum status</div>}
        {cfg.statuses.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3 px-4 py-3 group">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {editIdx === i ? (
              <>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={editClose} onChange={e => setEditClose(e.target.checked)} className="rounded" /> Fecha
                </label>
                <button onClick={saveEdit} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg">OK</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-sm text-gray-800">{s.label}</span>
                {s.isClosed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Fecha</span>}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => startEdit(i)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => delStatus(i)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addStatus()} placeholder="Novo status..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
        <button onClick={addStatus} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Adicionar</button>
      </div>
    </section>
  );
}

function DemandaPrioSection({ cfg, onChange }: { cfg: any; onChange: (patch: any) => void }) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [newBg,    setNewBg]    = useState("#f3f4f6");
  const [editIdx,  setEditIdx]  = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editBg,    setEditBg]    = useState("");

  function add() {
    if (!newLabel.trim()) return;
    const key = toKey(newLabel);
    const next = [...cfg.prioridades, { key, label: newLabel.trim(), color: newColor, bgColor: newBg, position: cfg.prioridades.length }];
    onChange({ demanda_prioridades: next }); setNewLabel(""); setNewColor("#6b7280"); setNewBg("#f3f4f6");
  }

  function startEdit(i: number) {
    const p = cfg.prioridades[i];
    setEditIdx(i); setEditLabel(p.label); setEditColor(p.color); setEditBg(p.bgColor);
  }

  function saveEdit() {
    if (editIdx === null) return;
    const next = cfg.prioridades.map((p: any, i: number) => i === editIdx ? { ...p, label: editLabel, color: editColor, bgColor: editBg } : p);
    onChange({ demanda_prioridades: next }); setEditIdx(null);
  }

  return (
    <section>
      <div className="mb-3"><h2 className="font-semibold text-gray-900">Prioridades de Demandas</h2><p className="text-sm text-gray-500 mt-0.5">A ordem define a hierarquia (mais urgente primeiro)</p></div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-3">
        {cfg.prioridades.map((p: any, i: number) => (
          <div key={p.key} className="flex items-center gap-3 px-4 py-3 group">
            {editIdx === i ? (
              <>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: editColor, backgroundColor: editBg }}>{editLabel || "Prévia"}</span>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" title="Cor do texto" />
                <input type="color" value={editBg}    onChange={e => setEditBg(e.target.value)}    className="w-8 h-8 rounded border border-gray-200 cursor-pointer" title="Cor de fundo" />
                <button onClick={saveEdit} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg">OK</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0" style={{ color: p.color, backgroundColor: p.bgColor }}>{p.label}</span>
                <span className="flex-1" />
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => startEdit(i)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => onChange({ demanda_prioridades: cfg.prioridades.filter((_: any, j: number) => j !== i) })} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Nova prioridade..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" title="Cor texto" />
        <input type="color" value={newBg}    onChange={e => setNewBg(e.target.value)}    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" title="Cor fundo" />
        <button onClick={add} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Adicionar</button>
      </div>
    </section>
  );
}

function DemandaSegmentoSection({ cfg, onChange }: { cfg: any; onChange: (patch: any) => void }) {
  const [newSeg, setNewSeg] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal,  setEditVal]  = useState("");

  function add() {
    if (!newSeg.trim() || cfg.segmentos.includes(newSeg.trim())) return;
    onChange({ demanda_segmentos: [...cfg.segmentos, newSeg.trim()] }); setNewSeg("");
  }

  return (
    <section>
      <div className="mb-3"><h2 className="font-semibold text-gray-900">Segmentos de Demandas</h2><p className="text-sm text-gray-500 mt-0.5">Categorias de segmento para classificar demandas</p></div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-3">
        {cfg.segmentos.map((s: string, i: number) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 group">
            {editIdx === i ? (
              <>
                <input value={editVal} onChange={e => setEditVal(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <button onClick={() => { onChange({ demanda_segmentos: cfg.segmentos.map((x: string, j: number) => j === i ? editVal : x) }); setEditIdx(null); }} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg">OK</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{s}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => { setEditIdx(i); setEditVal(s); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={13} /></button>
                  <button onClick={() => onChange({ demanda_segmentos: cfg.segmentos.filter((_: string, j: number) => j !== i) })} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newSeg} onChange={e => setNewSeg(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Novo segmento..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button onClick={add} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Adicionar</button>
      </div>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const [statuses, setStatuses]     = useState<any[]>([]);
  const [roles, setRoles]           = useState<PersonRole[]>([]);
  const [labels, setLabels]         = useState<any[]>([]);
  const [demandaCfg, setDemandaCfg] = useState<any>({ statuses: [], prioridades: [], segmentos: [] });
  const [savingCfg, setSavingCfg]   = useState(false);
  const [modal, setModal]           = useState<"newStatus" | "editStatus" | "editRole" | "newLabel" | "editLabel" | null>(null);
  const [editingStatus, setEditingStatus] = useState<any | null>(null);
  const [editingRole, setEditingRole]     = useState<PersonRole | null>(null);
  const [editingLabel, setEditingLabel]   = useState<any | null>(null);

  const loadStatuses = useCallback(async () => {
    const r = await fetch("/api/kanban");
    setStatuses(await r.json());
  }, []);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  const loadLabels = useCallback(async () => {
    const r = await fetch("/api/labels");
    setLabels(await r.json());
  }, []);

  const loadDemandaCfg = useCallback(async () => {
    const r = await fetch("/api/demandas/config");
    setDemandaCfg(await r.json());
  }, []);

  useEffect(() => { loadStatuses(); loadRoles(); loadLabels(); loadDemandaCfg(); }, [loadStatuses, loadRoles, loadLabels, loadDemandaCfg]);

  async function saveDemandaCfg(patch: any) {
    const updated = { statuses: demandaCfg.statuses, prioridades: demandaCfg.prioridades, segmentos: demandaCfg.segmentos, ...patch };
    setDemandaCfg(updated);
    setSavingCfg(true);
    try {
      const body: any = {};
      if (patch.demanda_statuses)    body.demanda_statuses    = patch.demanda_statuses ?? updated.statuses;
      if (patch.demanda_prioridades) body.demanda_prioridades = patch.demanda_prioridades ?? updated.prioridades;
      if (patch.demanda_segmentos)   body.demanda_segmentos   = patch.demanda_segmentos  ?? updated.segmentos;
      if (patch.demanda_statuses !== undefined)    body.demanda_statuses    = patch.demanda_statuses;
      if (patch.demanda_prioridades !== undefined) body.demanda_prioridades = patch.demanda_prioridades;
      if (patch.demanda_segmentos !== undefined)   body.demanda_segmentos   = patch.demanda_segmentos;
      await fetch("/api/demandas/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await loadDemandaCfg();
    } finally { setSavingCfg(false); }
  }

  async function initSeed() {
    const r = await fetch("/api/seed", { method: "POST" });
    const d = await r.json();
    toast.success(d.message ?? "Feito!");
    loadStatuses();
  }

  async function delStatus(id: string, name: string) {
    const r = await fetch(`/api/kanban/${id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
    toast.success(`"${name}" removido`); loadStatuses();
  }

  async function delLabel(id: string, name: string) {
    await fetch(`/api/labels/${id}`, { method: "DELETE" });
    toast.success(`"${name}" removida`); loadLabels();
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Kanban, Cargos e Etiquetas</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

        {/* Cargos */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Cargos e Hierarquia</h2>
            <p className="text-sm text-gray-500 mt-0.5">Edite os nomes e cores dos cargos. A ordem reflete a hierarquia.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-4 px-4 py-3 group">
                <span className="text-xs text-gray-400 w-5 text-center">{role.level + 1}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: role.color, backgroundColor: role.bgColor }}>
                  {role.label}
                </span>
                <span className="flex-1 text-xs text-gray-400 font-mono">{role.key}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingRole(role); setModal("editRole"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Kanban */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Colunas do Kanban</h2>
              <p className="text-sm text-gray-500 mt-0.5">Crie, edite e reordene as colunas do seu pipeline</p>
            </div>
            <div className="flex gap-2">
              <button onClick={initSeed} className="text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg">Restaurar padrão</button>
              <button onClick={() => { setEditingStatus(null); setModal("newStatus"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Plus size={15} /> Nova coluna
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {statuses.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">
                Nenhuma coluna criada. <button onClick={initSeed} className="text-brand-600 hover:underline">Criar colunas padrão</button>
              </div>
            )}
            {statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3 group">
                <GripVertical size={16} className="text-gray-300 cursor-grab" />
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 font-medium text-sm text-gray-800">{s.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.conversations?.length ?? 0} cards</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingStatus(s); setModal("editStatus"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                  <button onClick={() => delStatus(s.id, s.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Demanda: Status */}
        <DemandaStatusSection cfg={demandaCfg}
          onChange={patch => saveDemandaCfg(patch)} />

        {/* Demanda: Prioridade */}
        <DemandaPrioSection cfg={demandaCfg}
          onChange={patch => saveDemandaCfg(patch)} />

        {/* Demanda: Segmento */}
        <DemandaSegmentoSection cfg={demandaCfg}
          onChange={patch => saveDemandaCfg(patch)} />

        {/* Etiquetas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Etiquetas</h2>
              <p className="text-sm text-gray-500 mt-0.5">Gerencie as etiquetas usadas nas conversas e contatos</p>
            </div>
            <button onClick={() => { setEditingLabel(null); setModal("newLabel"); }}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Nova etiqueta
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {labels.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">Nenhuma etiqueta criada.</div>
            )}
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-4 px-4 py-3 group">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ color: l.color, backgroundColor: l.bgColor }}>
                  {l.name}
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-mono">{l.color}</span>
                  <span>·</span>
                  <span className="font-mono">{l.bgColor}</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingLabel(l); setModal("editLabel"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                  <button onClick={() => delLabel(l.id, l.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <Modal open={modal === "newStatus"} onClose={() => setModal(null)} title="Nova Coluna" size="sm">
        <StatusForm onSave={() => { setModal(null); loadStatuses(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editStatus"} onClose={() => setModal(null)} title="Editar Coluna" size="sm">
        <StatusForm initial={editingStatus} onSave={() => { setModal(null); loadStatuses(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editRole"} onClose={() => setModal(null)} title="Editar Cargo" size="sm">
        <RoleForm initial={editingRole} onSave={() => { setModal(null); loadRoles(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "newLabel"} onClose={() => setModal(null)} title="Nova Etiqueta" size="sm">
        <LabelForm onSave={() => { setModal(null); loadLabels(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "editLabel"} onClose={() => setModal(null)} title="Editar Etiqueta" size="sm">
        <LabelForm initial={editingLabel} onSave={() => { setModal(null); loadLabels(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
