"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Plus, Users, CheckCheck, Clock, Trash2, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CampanhasTabs } from "@/components/ui/CampanhasTabs";
import toast from "react-hot-toast";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  ATIVA:      { label: "Ativa",      color: "#059669", bg: "#d1fae5" },
  PAUSADA:    { label: "Pausada",    color: "#d97706", bg: "#fef3c7" },
  CONCLUIDA:  { label: "Concluída",  color: "#4f46e5", bg: "#eef2ff" },
};

function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !messageTemplate.trim()) { toast.error("Nome e mensagem são obrigatórios"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, goal, messageTemplate }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Campanha criada!");
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open title="Nova Campanha" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Convidar para seguir Instagram"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ex: Aumentar seguidores em 200"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem padrão *</label>
          <textarea rows={5} value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)}
            placeholder="Oi {{primeiroNome}}, aqui é {{primeiroLider}}! ..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono" />
          <p className="text-xs text-gray-400 mt-1">
            Variáveis disponíveis: <code>{"{{nome}}"}</code> · <code>{"{{primeiroNome}}"}</code> · <code>{"{{telefone}}"}</code> · <code>{"{{lider}}"}</code> · <code>{"{{primeiroLider}}"}</code>
          </p>
          <p className="text-xs text-gray-400 mt-1">Você poderá adicionar mídia, link e tags na tela da campanha.</p>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Criando..." : "Criar Campanha"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/campaigns");
    setCampaigns(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("campaigns", () => load());
    return () => es.close();
  }, [load]);

  async function del(c: any) {
    if (!confirm(`Excluir campanha "${c.name}"? Os contatos não serão removidos da base, apenas tirados desta campanha.`)) return;
    await fetch(`/api/campaigns/${c.id}`, { method: "DELETE" });
    toast.success("Campanha excluída");
    load();
  }

  const filtered = campaigns.filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-sm text-gray-500">Gerencie campanhas de relacionamento e converta com a equipe</p>
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nova Campanha
          </button>
        </div>
        <CampanhasTabs />
      </header>

      <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanha..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Send size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Nenhuma campanha</p>
            <p className="text-sm mt-1">Crie a primeira campanha para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {filtered.map(c => {
              const st = STATUS_CFG[c.status] ?? STATUS_CFG.ATIVA;
              const total = c._count?.contacts ?? 0;
              const pendentes = c.counts?.PENDENTE ?? 0;
              const enviados = c.counts?.ENVIADO ?? 0;
              const responderam = c.counts?.RESPONDEU ?? 0;
              const progresso = total > 0 ? Math.round(((enviados + responderam) / total) * 100) : 0;
              return (
                <Link key={c.id} href={`/campanhas/${c.id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{c.name}</h2>
                      {c.reuniaoOrigin && (
                        <p className="text-[11px] text-amber-700 mt-0.5 truncate">
                          <Users size={10} className="inline mr-1" />Reunião: {c.reuniaoOrigin.titulo}
                        </p>
                      )}
                      {c.goal && <p className="text-xs text-gray-500 mt-0.5 truncate">{c.goal}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span><Users size={11} className="inline mr-1" />{total} contatos</span>
                      <span>{progresso}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${progresso}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-gray-50 rounded-lg py-1.5">
                      <p className="text-sm font-semibold text-gray-700">{pendentes}</p>
                      <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5"><Clock size={9} /> pendentes</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg py-1.5">
                      <p className="text-sm font-semibold text-blue-700">{enviados}</p>
                      <p className="text-[10px] text-blue-600 flex items-center justify-center gap-0.5"><CheckCheck size={9} /> enviados</p>
                    </div>
                    <div className="bg-green-50 rounded-lg py-1.5">
                      <p className="text-sm font-semibold text-green-700">{responderam}</p>
                      <p className="text-[10px] text-green-600">responderam</p>
                    </div>
                  </div>

                  <div className="flex justify-end mt-3">
                    <button onClick={(e) => { e.preventDefault(); del(c); }}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={11} /> Excluir</button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {modal && <NewCampaignModal onClose={() => setModal(false)} onCreated={load} />}
    </div>
  );
}
