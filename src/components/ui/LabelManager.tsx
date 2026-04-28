"use client";
import { useState, useEffect, useRef } from "react";
import { Tag, X, Plus } from "lucide-react";

export interface LabelDef { id: string; name: string; color: string; bgColor: string; }

const PRESET_COLORS = [
  { color: "#10b981", bgColor: "#d1fae5" },
  { color: "#f59e0b", bgColor: "#fef3c7" },
  { color: "#3b82f6", bgColor: "#dbeafe" },
  { color: "#8b5cf6", bgColor: "#ede9fe" },
  { color: "#ef4444", bgColor: "#fee2e2" },
  { color: "#ec4899", bgColor: "#fce7f3" },
  { color: "#6366f1", bgColor: "#eef2ff" },
  { color: "#14b8a6", bgColor: "#ccfbf1" },
];

export function getLabelStyle(name: string, defs: LabelDef[]) {
  const def = defs.find(d => d.name === name);
  return { color: def?.color ?? "#6b7280", bgColor: def?.bgColor ?? "#f3f4f6" };
}

interface Props {
  contactId: string;
  labels: string[];
  onUpdate: (labels: string[]) => void;
  labelDefs?: LabelDef[];
  onDefsChange?: (defs: LabelDef[]) => void;
}

export function LabelManager({ contactId, labels, onUpdate, labelDefs, onDefsChange }: Props) {
  const [open, setOpen]       = useState(false);
  const [defs, setDefs]       = useState<LabelDef[]>(labelDefs ?? []);
  const [newName, setNewName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (labelDefs) { setDefs(labelDefs); return; }
    fetch("/api/labels").then(r => r.json()).then(setDefs);
  }, [labelDefs]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function toggle(name: string) {
    const next = labels.includes(name) ? labels.filter(l => l !== name) : [...labels, name];
    const r = await fetch(`/api/contacts/${contactId}/labels`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: next }),
    });
    if (r.ok) onUpdate(next);
  }

  async function createLabel() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const preset = PRESET_COLORS[colorIdx];
      const r = await fetch("/api/labels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: preset.color, bgColor: preset.bgColor }),
      });
      if (!r.ok) return;
      const def: LabelDef = await r.json();
      const next = [...defs, def];
      setDefs(next);
      onDefsChange?.(next);
      setNewName("");
      // auto-toggle
      const nextLabels = [...labels, def.name];
      await fetch(`/api/contacts/${contactId}/labels`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: nextLabels }),
      });
      onUpdate(nextLabels);
    } finally { setCreating(false); }
  }

  async function deleteLabel(def: LabelDef) {
    await fetch(`/api/labels/${def.id}`, { method: "DELETE" });
    const next = defs.filter(d => d.id !== def.id);
    setDefs(next);
    onDefsChange?.(next);
    if (labels.includes(def.name)) {
      const nextLabels = labels.filter(l => l !== def.name);
      await fetch(`/api/contacts/${contactId}/labels`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: nextLabels }),
      });
      onUpdate(nextLabels);
    }
  }

  const orphans = labels.filter(l => !defs.find(d => d.name === l));

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
        <Tag size={13} />
        {labels.length > 0 ? `${labels.length} etiqueta${labels.length > 1 ? "s" : ""}` : "Etiquetas"}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 w-72">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Etiquetas</p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {defs.map(def => (
              <div key={def.id} className="flex items-center gap-0.5 group">
                <button onClick={() => toggle(def.name)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={labels.includes(def.name)
                    ? { backgroundColor: def.color, color: "#fff", borderColor: "transparent" }
                    : { borderColor: "#e5e7eb", color: "#374151" }}>
                  {def.name}
                </button>
                <button onClick={() => deleteLabel(def)}
                  className="hidden group-hover:flex w-4 h-4 items-center justify-center rounded-full hover:bg-red-50">
                  <X size={9} className="text-gray-300 hover:text-red-400" />
                </button>
              </div>
            ))}
            {orphans.map(l => (
              <div key={l} className="flex items-center gap-0.5 bg-gray-100 rounded-full px-2.5 py-1">
                <span className="text-xs text-gray-600">{l}</span>
                <button onClick={() => toggle(l)}>
                  <X size={9} className="text-gray-400 hover:text-red-400 ml-1" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Nova etiqueta</p>
            <div className="flex gap-1 mb-2">
              {PRESET_COLORS.map((c, i) => (
                <button key={i} onClick={() => setColorIdx(i)}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c.color, borderColor: i === colorIdx ? "#111" : "transparent" }} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createLabel()}
                placeholder="Nome da etiqueta..."
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button onClick={createLabel} disabled={creating || !newName.trim()}
                className="px-2.5 py-1 bg-indigo-600 disabled:opacity-40 text-white rounded-lg text-xs hover:bg-indigo-700 flex items-center">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
