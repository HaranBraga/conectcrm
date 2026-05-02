"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Calendar, MapPin, Users, Megaphone, Home, ArrowRight } from "lucide-react";
import { CampanhasTabs } from "@/components/ui/CampanhasTabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  AGENDADA:  { label: "Agendada",  color: "#4f46e5", bg: "#eef2ff" },
  REALIZADA: { label: "Realizada", color: "#059669", bg: "#d1fae5" },
  CANCELADA: { label: "Cancelada", color: "#dc2626", bg: "#fee2e2" },
};

export default function CampanhasReunioesPage() {
  const router = useRouter();
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rr, cc] = await Promise.all([
      fetch("/api/reunioes").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
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

  async function startDispatch(reuniao: any, mode: "anfitrioes" | "presentes" | "all") {
    setCreating(reuniao.id + mode);
    try {
      const r = await fetch("/api/campaigns/from-reuniao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuniaoId: reuniao.id, mode }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`Campanha criada com ${d.addedContacts} contato(s)`);
      router.push(`/campanhas/${d.id}`);
    } finally { setCreating(null); }
  }

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
              const totSemAnf = Math.max(0, totPres - totAnf);
              const existingCampaigns = campaignsByReuniao.get(r.id) ?? [];
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-4 mb-3">
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
                  </div>

                  {/* Botões de disparo */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => startDispatch(r, "anfitrioes")} disabled={totAnf === 0 || creating === r.id + "anfitrioes"}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                      <Home size={12} />
                      {creating === r.id + "anfitrioes" ? "Criando..." : `Disparo Anfitriões (${totAnf})`}
                      <ArrowRight size={11} />
                    </button>
                    <button onClick={() => startDispatch(r, "presentes")} disabled={totSemAnf === 0 || creating === r.id + "presentes"}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                      <Users size={12} />
                      {creating === r.id + "presentes" ? "Criando..." : `Disparo Presentes (${totSemAnf})`}
                      <ArrowRight size={11} />
                    </button>
                    <button onClick={() => startDispatch(r, "all")} disabled={totPres === 0 || creating === r.id + "all"}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-800 border border-brand-200 hover:bg-brand-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                      <Megaphone size={12} />
                      {creating === r.id + "all" ? "Criando..." : `Disparo Todos (${totPres})`}
                      <ArrowRight size={11} />
                    </button>
                  </div>

                  {existingCampaigns.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1.5">Disparos já criados desta reunião</p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingCampaigns.map(c => {
                          const pend = c.counts?.PENDENTE ?? 0;
                          const env  = (c.counts?.ENVIADO ?? 0) + (c.counts?.RESPONDEU ?? 0);
                          return (
                            <Link key={c.id} href={`/campanhas/${c.id}`}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-brand-300">
                              <span className="font-medium text-gray-700">{c.name.replace(`Reunião: ${r.titulo} — `, "")}</span>
                              <span className="text-[10px] text-gray-400">{env}/{c._count?.contacts ?? 0}</span>
                              {pend > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pend} pendentes</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
