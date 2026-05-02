"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Calendar, MapPin, Users, ChevronRight } from "lucide-react";
import { CampanhasTabs } from "@/components/ui/CampanhasTabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  AGENDADA:  { label: "Agendada",  color: "#4f46e5", bg: "#eef2ff" },
  REALIZADA: { label: "Realizada", color: "#059669", bg: "#d1fae5" },
  CANCELADA: { label: "Cancelada", color: "#dc2626", bg: "#fee2e2" },
};

const MODE_LABEL: Record<string, string> = {
  anfitrioes: "Anfitriões",
  presentes:  "Presentes",
  all:        "Todos",
};

export default function CampanhasReunioesPage() {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const load = useCallback(async () => {
    const [rr, cc] = await Promise.all([
      fetch("/api/reunioes").then(r => r.json()),
      fetch("/api/campaigns?includeReuniaoDispatches=true").then(r => r.json()),
    ]);
    setReunioes(rr); setCampaigns(cc);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mapa: reuniaoId → lista de campanhas existentes daquela reunião
  const campaignsByReuniao = useMemo(() => {
    const map = new Map<string, any[]>();
    campaigns.forEach(c => {
      if (c.reuniaoOrigin?.id) {
        if (!map.has(c.reuniaoOrigin.id)) map.set(c.reuniaoOrigin.id, []);
        map.get(c.reuniaoOrigin.id)!.push(c);
      }
    });
    return map;
  }, [campaigns]);

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
              const existingCampaigns = campaignsByReuniao.get(r.id) ?? [];
              return (
                <Link key={r.id} href={`/campanhas/reunioes/${r.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-brand-300 transition-all block">
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

                      {existingCampaigns.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {existingCampaigns.map(c => {
                            const pend = c.counts?.PENDENTE ?? 0;
                            const env  = (c.counts?.ENVIADO ?? 0) + (c.counts?.RESPONDEU ?? 0);
                            return (
                              <span key={c.id} className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <span className="font-medium">{MODE_LABEL[c.reuniaoMode] ?? c.reuniaoMode}</span>
                                <span className="text-[10px] opacity-70">{env}/{c._count?.contacts ?? 0}</span>
                                {pend > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full">{pend} pend.</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-gray-300 mt-1 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
