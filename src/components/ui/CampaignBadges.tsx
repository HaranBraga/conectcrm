"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Tag } from "lucide-react";

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

export function CampaignBadges({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/contacts/${contactId}/campaigns`)
      .then(r => r.json())
      .then(d => { if (alive) { setItems(d); setLoading(false); } })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [contactId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-indigo-50/50 border-b border-indigo-100 overflow-x-auto">
      <Megaphone size={12} className="text-indigo-500 shrink-0" />
      <span className="text-[11px] text-indigo-600 font-medium shrink-0">Campanhas:</span>
      {items.map(cc => {
        const sc = STATUS_COLOR[cc.status] ?? STATUS_COLOR.PENDENTE;
        return (
          <Link key={cc.id} href={`/campanhas/${cc.campaign.id}`}
            className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-white border border-indigo-100 hover:border-indigo-300 shrink-0">
            <span className="font-medium text-gray-700">{cc.campaign.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: sc.bg, color: sc.fg }}>
              {STATUS_LABEL[cc.status]}
            </span>
            {cc.responseTag && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                style={{ backgroundColor: cc.responseTag.bgColor, color: cc.responseTag.color }}>
                <Tag size={9} />{cc.responseTag.label}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
