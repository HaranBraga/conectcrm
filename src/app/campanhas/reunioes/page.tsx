"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Calendar, MapPin, Users, Megaphone } from "lucide-react";
import { CampanhasTabs } from "@/components/ui/CampanhasTabs";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  AGENDADA:  { label: "Agendada",  color: "#4f46e5", bg: "#eef2ff" },
  REALIZADA: { label: "Realizada", color: "#059669", bg: "#d1fae5" },
  CANCELADA: { label: "Cancelada", color: "#dc2626", bg: "#fee2e2" },
};

function AddToCampaignModal({ reuniao, campaigns, onClose, onAdded }: any) {
  const [campaignId, setCampaignId] = useState("");
  const [mode, setMode] = useState<"all" | "anfitrioes" | "presentes">("all");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!campaignId) { toast.error("Selecione uma campanha"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuniaoId: reuniao.id, mode }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`${d.added} contatos adicionados${d.skipped ? ` · ${d.skipped} já estavam` : ""}`);
      onAdded(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open title={`Adicionar contatos de "${reuniao.titulo}"`} onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campanha de destino</label>
          <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione uma campanha...</option>
            {campaigns.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({c.counts?.PENDENTE ?? 0} pendentes)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quem incluir</label>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all", label: "Todos os presentes" },
              { key: "anfitrioes", label: "Apenas anfitriões" },
              { key: "presentes", label: "Presentes (sem anfitriões)" },
            ] as const).map(opt => (
              <button key={opt.key} type="button" onClick={() => setMode(opt.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${mode === opt.key ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={add} disabled={saving || !campaignId}
            className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CampanhasReunioesPage() {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [picked, setPicked] = useState<any | null>(null);

  const load = useCallback(async () => {
    const [rr, cc] = await Promise.all([
      fetch("/api/reunioes").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
    ]);
    setReunioes(rr); setCampaigns(cc);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => reunioes.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.titulo?.toLowerCase().includes(q) && !r.local?.toLowerCase().includes(q) && !r.bairro?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [reunioes, search, statusFilter]);

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-sm text-gray-500">Reuniões disponíveis para origem de campanhas</p>
          </div>
        </div>
        <CampanhasTabs />
      </header>

      <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reunião por título, local ou bairro..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex gap-1.5">
          {(["", "REALIZADA", "AGENDADA", "CANCELADA"] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${statusFilter === s ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {s === "" ? "Todas" : STATUS_CFG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Nenhuma reunião encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto">
            {filtered.map(r => {
              const st = STATUS_CFG[r.status] ?? STATUS_CFG.REALIZADA;
              const totPres = r._count?.presentes ?? 0;
              const totAnf  = r.anfitrioes?.length ?? 0;
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-semibold text-gray-900 text-sm">{r.titulo}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar size={11} />{format(new Date(r.dataHora), "dd MMM yyyy", { locale: ptBR })}</span>
                        {r.local && <span className="flex items-center gap-1"><MapPin size={11} />{r.local}</span>}
                        <span className="flex items-center gap-1"><Users size={11} />{totPres} presentes · {totAnf} anfitriões</span>
                        {r.lider && <span>Líder: {r.lider.name}</span>}
                      </div>
                    </div>
                    <button onClick={() => setPicked(r)}
                      disabled={totPres === 0 && totAnf === 0}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs font-medium shrink-0">
                      <Megaphone size={13} /> Adicionar a campanha
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picked && <AddToCampaignModal reuniao={picked} campaigns={campaigns} onClose={() => setPicked(null)} onAdded={load} />}
    </div>
  );
}
