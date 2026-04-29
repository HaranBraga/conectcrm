"use client";
import { useState, useEffect, useRef } from "react";
import { Tag, X } from "lucide-react";

export interface LabelDef { id: string; name: string; color: string; bgColor: string; }


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

          {defs.length === 0 && orphans.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma etiqueta criada.<br />Gerencie em Configurações.</p>
          )}
        </div>
      )}
    </div>
  );
}
