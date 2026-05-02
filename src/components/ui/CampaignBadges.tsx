"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Megaphone, Tag, ChevronDown, Check, X } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:  "pendente",
  ENVIADO:   "enviado",
  RESPONDEU: "respondeu",
  IGNOROU:   "ignorou",
};

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDENTE:  { bg: "#f3f4f6", fg: "#6b7280" },
  ENVIADO:   { bg: "#dbeafe", fg: "#1d4ed8" },
  RESPONDEU: { bg: "#d1fae5", fg: "#047857" },
  IGNOROU:   { bg: "#fee2e2", fg: "#b91c1c" },
};

function CampaignBadge({ cc, onChanged }: { cc: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sc = STATUS_COLOR[cc.status] ?? STATUS_COLOR.PENDENTE;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function openDropdown() {
    if (!open && tags.length === 0) {
      const r = await fetch(`/api/campaigns/${cc.campaign.id}/tags`);
      setTags(await r.json());
    }
    setOpen(o => !o);
  }

  async function setTag(tagId: string | null) {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${cc.campaign.id}/contacts/${cc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseTagId: tagId, ...(tagId && cc.status === "PENDENTE" ? { status: "RESPONDEU" } : {}) }),
      });
      onChanged();
      setOpen(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="relative shrink-0 flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full bg-white border border-indigo-100" ref={ref}>
      <Link href={`/campanhas/${cc.campaign.id}`} className="font-medium text-gray-700 hover:underline">
        {cc.campaign.name}
      </Link>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
        style={{ backgroundColor: sc.bg, color: sc.fg }}>
        {STATUS_LABEL[cc.status]}
      </span>
      <button onClick={openDropdown}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-gray-100 transition-colors">
        {cc.responseTag ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
            style={{ backgroundColor: cc.responseTag.bgColor, color: cc.responseTag.color }}>
            <Tag size={9} />{cc.responseTag.label}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Tag size={9} /> etiquetar
          </span>
        )}
        <ChevronDown size={10} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 w-56 max-h-64 overflow-y-auto">
          <p className="text-[10px] uppercase font-semibold text-gray-400 px-2 py-1">Etiqueta da resposta</p>
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-2">Carregando...</p>
          ) : tags.map((t: any) => {
            const isOn = cc.responseTagId === t.id;
            return (
              <button key={t.id} disabled={saving} onClick={() => setTag(t.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left disabled:opacity-50">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="flex-1">{t.label}</span>
                {isOn && <Check size={12} className="text-brand-600" />}
              </button>
            );
          })}
          {cc.responseTag && (
            <button disabled={saving} onClick={() => setTag(null)}
              className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-red-50 rounded text-xs text-left text-red-500 border-t border-gray-100 mt-1 pt-2">
              <X size={11} /> Remover etiqueta
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CampaignBadges({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/contacts/${contactId}/campaigns`)
      .then(r => r.json())
      .then(d => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [contactId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-indigo-50/50 border-b border-indigo-100 overflow-x-auto">
      <Megaphone size={12} className="text-indigo-500 shrink-0" />
      <span className="text-[11px] text-indigo-600 font-medium shrink-0">Campanhas:</span>
      {items.map(cc => <CampaignBadge key={cc.id} cc={cc} onChanged={load} />)}
    </div>
  );
}
