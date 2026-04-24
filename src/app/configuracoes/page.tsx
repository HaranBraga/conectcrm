"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, GripVertical, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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

export default function ConfiguracoesPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/kanban");
    const data = await r.json();
    setStatuses(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function checkApi() {
    setChecking(true);
    try {
      const r = await fetch("/api/seed", { method: "POST" });
      if (r.ok) setApiStatus("ok"); else setApiStatus("error");
    } catch { setApiStatus("error"); }
    finally { setChecking(false); }
  }

  async function initSeed() {
    const r = await fetch("/api/seed", { method: "POST" });
    const d = await r.json();
    toast.success(d.message ?? "Feito!");
    load();
  }

  async function del(id: string, name: string) {
    const r = await fetch(`/api/kanban/${id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
    toast.success(`"${name}" removido`); load();
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Kanban e Evolution API</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Kanban Columns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Colunas do Kanban</h2>
              <p className="text-sm text-gray-500 mt-0.5">Crie, edite e reordene as colunas do seu pipeline</p>
            </div>
            <div className="flex gap-2">
              <button onClick={initSeed} className="text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg">Restaurar padrão</button>
              <button onClick={() => { setEditing(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
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
                  <button onClick={() => { setEditing(s); setModal("edit"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                  <button onClick={() => del(s.id, s.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Evolution API Info */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Evolution API</h2>
          <p className="text-sm text-gray-500 mb-4">Configure as variáveis no arquivo <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> do projeto</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
            {[
              { key: "EVOLUTION_API_URL", desc: "URL da sua instância Evolution API" },
              { key: "EVOLUTION_API_KEY", desc: "API Key (global ou de instância)" },
              { key: "EVOLUTION_INSTANCE", desc: "Nome da instância WhatsApp" },
              { key: "DATABASE_URL", desc: "Connection string do PostgreSQL" },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-start gap-3">
                <code className="text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1 text-brand-700 shrink-0">{key}</code>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={checkApi} disabled={checking} className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600 transition-colors">
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> Testar conexão com DB
            </button>
            {apiStatus === "ok" && <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle size={15} /> Conectado</span>}
            {apiStatus === "error" && <span className="flex items-center gap-1.5 text-red-500 text-sm"><AlertCircle size={15} /> Erro na conexão</span>}
          </div>
        </section>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Coluna" : "Nova Coluna"} size="sm">
        <StatusForm initial={modal === "edit" ? editing : undefined} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
