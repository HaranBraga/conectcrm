"use client";
import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle, XCircle, Clock, Users, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:  { label: "Pendente",  color: "text-gray-500",  icon: Clock },
  SENDING:  { label: "Enviando",  color: "text-amber-500", icon: Clock },
  DONE:     { label: "Concluído", color: "text-green-600", icon: CheckCircle },
  FAILED:   { label: "Falhou",    color: "text-red-500",   icon: XCircle },
};

function NewDispatchModal({ groups, reunioes, onClose, onSent }: any) {
  const [origem, setOrigem]   = useState<"grupo" | "reuniao">("grupo");
  const [groupId, setGroupId] = useState("");
  const [reuniaoId, setReuniaoId] = useState("");
  const [reuniaoMode, setReuniaoMode] = useState<"all" | "anfitrioes" | "presentes">("all");
  const [message, setMessage] = useState("");
  const [delay, setDelay]     = useState(2000);
  const [preview, setPreview] = useState<any | null>(null);
  const [sending, setSending] = useState(false);

  async function loadPreview() {
    if (origem === "grupo" && groupId) {
      const r = await fetch(`/api/groups/${groupId}`);
      setPreview(await r.json());
    } else if (origem === "reuniao" && reuniaoId) {
      const r = await fetch(`/api/reunioes/${reuniaoId}`);
      const reuniao = await r.json();
      const anfIds = new Set(reuniao.anfitrioes?.map((a: any) => a.contactId) ?? []);
      let members: any[] = [];
      if (reuniaoMode === "anfitrioes") {
        members = (reuniao.anfitrioes ?? []).map((a: any) => ({ contactId: a.contactId, contact: a.contact }));
      } else if (reuniaoMode === "presentes") {
        members = (reuniao.presentes ?? [])
          .filter((p: any) => p.contactId && !anfIds.has(p.contactId))
          .map((p: any) => ({ contactId: p.contactId, contact: p.contact }));
      } else {
        members = (reuniao.presentes ?? [])
          .filter((p: any) => p.contactId)
          .map((p: any) => ({ contactId: p.contactId, contact: p.contact }));
      }
      setPreview({ name: reuniao.titulo, members });
    } else {
      setPreview(null);
    }
  }

  useEffect(() => { loadPreview(); }, [origem, groupId, reuniaoId, reuniaoMode]);

  async function send() {
    if (!message.trim()) { toast.error("Escreva a mensagem"); return; }
    if (origem === "grupo" && !groupId) { toast.error("Selecione um grupo"); return; }
    if (origem === "reuniao" && !reuniaoId) { toast.error("Selecione uma reunião"); return; }
    setSending(true);
    try {
      const body: any = { message, delayMs: delay };
      if (origem === "grupo") body.groupId = groupId;
      else { body.reuniaoId = reuniaoId; body.mode = reuniaoMode; }

      const r = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "Erro ao iniciar disparo"); return; }
      toast.success(`Disparo iniciado para ${d.total} contatos!`);
      onSent(); onClose();
    } catch { toast.error("Erro ao iniciar disparo"); }
    finally { setSending(false); }
  }

  return (
    <Modal open title="Novo Disparo em Massa" onClose={onClose} size="lg">
      <div className="flex flex-col gap-5">
        {/* Toggle origem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Origem</label>
          <div className="flex gap-1.5">
            {(["grupo", "reuniao"] as const).map(m => (
              <button key={m} type="button" onClick={() => { setOrigem(m); setPreview(null); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${origem === m ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
                {m === "grupo" ? "Grupo" : "Reunião"}
              </button>
            ))}
          </div>
        </div>

        {origem === "grupo" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de contatos *</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Selecione um grupo...</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name} ({g._count?.members ?? 0} contatos)</option>)}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reunião *</label>
              <select value={reuniaoId} onChange={(e) => setReuniaoId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Selecione uma reunião...</option>
                {reunioes.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo} — {format(new Date(r.dataHora), "dd/MM/yyyy", { locale: ptBR })} ({r._count?.presentes ?? 0} presentes)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enviar para</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: "all", label: "Todos os presentes" },
                  { key: "anfitrioes", label: "Apenas anfitriões" },
                  { key: "presentes", label: "Presentes (sem anfitriões)" },
                ] as const).map(opt => (
                  <button key={opt.key} type="button" onClick={() => setReuniaoMode(opt.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${reuniaoMode === opt.key ? "bg-indigo-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Anfitriões e demais presentes podem receber mensagens diferentes — escolha um modo por disparo.</p>
            </div>
          </>
        )}

        {preview && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Users size={14} /> Destinatários ({preview.members?.length ?? 0})</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {preview.members?.map((m: any) => (
                <p key={m.contactId} className="text-xs text-gray-600">{m.contact?.name ?? "—"} — {m.contact?.phone ?? ""}</p>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
          <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Digite a mensagem que será enviada para todos os contatos do grupo..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <p className="text-xs text-gray-400 mt-1">{message.length} caracteres</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo entre mensagens</label>
          <select value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value={1000}>1 segundo</option>
            <option value={2000}>2 segundos (padrão)</option>
            <option value={3000}>3 segundos</option>
            <option value={5000}>5 segundos</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Intervalo entre cada envio para evitar bloqueio</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={send}
            disabled={sending || !message.trim() || (origem === "grupo" ? !groupId : !reuniaoId)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <Send size={15} />{sending ? "Iniciando..." : "Iniciar Disparo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DispatchResultModal({ dispatch, onClose }: any) {
  const [detail, setDetail] = useState<any | null>(null);
  useEffect(() => {
    fetch(`/api/dispatch/${dispatch.id}`).then((r) => r.json()).then(setDetail);
  }, [dispatch.id]);

  const ok = detail?.results?.filter((r: any) => r.success).length ?? 0;
  const fail = detail?.results?.filter((r: any) => !r.success).length ?? 0;

  return (
    <Modal open title={`Resultados — ${dispatch.group?.name}`} onClose={onClose} size="lg">
      {!detail ? <p className="text-center text-gray-400 py-8">Carregando...</p> : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-green-600">{ok}</p><p className="text-sm text-green-700">Enviados</p></div>
            <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-600">{fail}</p><p className="text-sm text-red-700">Falhou</p></div>
          </div>
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {detail.results.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                {r.success ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.contactName}</p>
                  <p className="text-xs text-gray-500">{r.phone}</p>
                </div>
                {r.error && <p className="text-xs text-red-400 max-w-[160px] truncate">{r.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function DisparosPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [modal, setModal] = useState<"new" | "result" | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    const [d, g, r] = await Promise.all([
      fetch("/api/dispatch").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/reunioes").then((r) => r.json()),
    ]);
    setDispatches(d); setGroups(g); setReunioes(r);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div><h1 className="text-xl font-bold text-gray-900">Disparos</h1><p className="text-sm text-gray-500">Envio em massa via Evolution API</p></div>
        <button onClick={() => setModal("new")} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={16} /> Novo Disparo
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {dispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Send size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Nenhum disparo realizado</p>
            <p className="text-sm mt-1">Crie grupos com contatos e faça o primeiro disparo</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {dispatches.map((d) => {
              const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;
              const Icon = cfg.icon;
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4">
                  <Icon size={18} className={cfg.color} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{d.group?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{d.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d._count?.results ?? 0} enviados</p>
                  </div>
                  {d.sentAt && <p className="text-xs text-gray-400 shrink-0">{format(new Date(d.sentAt), "dd/MM HH:mm", { locale: ptBR })}</p>}
                  {d.status === "DONE" && (
                    <button onClick={() => { setSelected(d); setModal("result"); }} className="text-xs text-brand-600 hover:underline shrink-0">Ver resultado</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === "new" && <NewDispatchModal groups={groups} reunioes={reunioes} onClose={() => setModal(null)} onSent={load} />}
      {modal === "result" && selected && <DispatchResultModal dispatch={selected} onClose={() => setModal(null)} />}
    </div>
  );
}
