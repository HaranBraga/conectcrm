"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Cake, Send, Save, Phone, MapPin, Calendar, Check, AlertCircle, Star } from "lucide-react";
import { CampanhasTabs } from "@/components/ui/CampanhasTabs";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";
import { displayPhone } from "@/lib/phone-display";

const VARIABLES = [
  { key: "primeiroNome",  label: "Primeiro nome" },
  { key: "nome",          label: "Nome completo" },
  { key: "lider",         label: "Nome do líder" },
  { key: "primeiroLider", label: "Primeiro nome do líder" },
];

const DAY_OPTIONS = [
  { value: 0,  label: "Hoje" },
  { value: 3,  label: "Próximos 3 dias" },
  { value: 7,  label: "Próximos 7 dias" },
  { value: 15, label: "Próximos 15 dias" },
  { value: 30, label: "Próximos 30 dias" },
];

export default function AniversariosPage() {
  const [days, setDays]       = useState(7);
  const [items, setItems]     = useState<any[]>([]);
  const [template, setTemplate] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [previewCc, setPreviewCc] = useState<any | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        fetch(`/api/birthdays/upcoming?days=${days}`).then(r => r.json()),
        fetch("/api/birthdays/config").then(r => r.json()),
      ]);
      setItems(list);
      setTemplate(cfg.template ?? "");
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  async function saveTemplate() {
    setSavingTpl(true);
    try {
      const r = await fetch("/api/birthdays/config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Template salvo");
    } finally { setSavingTpl(false); }
  }

  async function send(contact: any) {
    setSending(contact.id);
    try {
      const r = await fetch("/api/birthdays/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success(`Mensagem enviada para ${contact.name}`);
      load();
    } finally { setSending(null); }
  }

  function insertVar(key: string) {
    const placeholder = `{{${key}}}`;
    const ta = taRef.current;
    if (!ta) { setTemplate(prev => prev + placeholder); return; }
    const start = ta.selectionStart ?? template.length;
    const end   = ta.selectionEnd ?? template.length;
    setTemplate(template.slice(0, start) + placeholder + template.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + placeholder.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/variable");
    if (!key) return;
    insertVar(key);
  }

  function previewMessage(c: any): string {
    const first = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : "");
    const map: Record<string, string> = {
      nome: c.name ?? "",
      primeiroNome: first(c.name),
      lider: c.parent?.name ?? "",
      primeiroLider: first(c.parent?.name),
    };
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
  }

  const today = new Date();
  const todayCount = items.filter(i => i.daysFromToday === 0).length;
  const sentTodayCount = items.filter(i => i.daysFromToday === 0 && i.sentThisYear).length;

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Cake size={20} className="text-pink-500" /> Aniversariantes
            </h1>
            <p className="text-sm text-gray-500">Mensagens de aniversário automáticas para sua base</p>
          </div>
          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${days === opt.value ? "bg-pink-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white hover:border-pink-300"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <CampanhasTabs />
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">

          {/* Resumo de hoje */}
          {todayCount > 0 && (
            <section className="bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                  <Cake size={22} className="text-pink-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-pink-700">
                    {todayCount} aniversariante{todayCount > 1 ? "s" : ""} hoje
                  </p>
                  <p className="text-xs text-pink-600">
                    {sentTodayCount > 0 ? `${sentTodayCount} já recebeu mensagem · ${todayCount - sentTodayCount} pendente(s)` : "Nenhuma mensagem enviada ainda"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Template editor */}
          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Mensagem de aniversário</h3>
              <button onClick={saveTemplate} disabled={savingTpl}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium">
                <Save size={12} /> {savingTpl ? "Salvando..." : "Salvar template"}
              </button>
            </div>

            <div className="mb-2">
              <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">Campos personalizados — arraste ou clique</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <button key={v.key} type="button"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/variable", v.key); e.dataTransfer.effectAllowed = "copy"; }}
                    onClick={() => insertVar(v.key)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[11px] text-pink-700 hover:bg-pink-100 cursor-grab active:cursor-grabbing select-none">
                    <span className="font-mono">{`{{${v.key}}}`}</span>
                    <span className="text-[10px] text-pink-400">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea ref={taRef} rows={4} value={template} onChange={e => setTemplate(e.target.value)}
              onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              placeholder="Feliz aniversário, {{primeiroNome}}! 🎉..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </section>

          {/* Lista de aniversariantes */}
          {loading ? (
            <p className="text-center text-gray-400 py-10">Carregando...</p>
          ) : items.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
              <Cake size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Nenhum aniversariante {days === 0 ? "hoje" : `nos próximos ${days} dia(s)`}</p>
              <p className="text-xs text-gray-400 mt-1">Cadastre a data de nascimento dos contatos pra eles aparecerem aqui</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {items.map(c => {
                const hoje = c.daysFromToday === 0;
                const sent = !!c.sentThisYear;
                const dataLabel = hoje ? "Hoje 🎂" : `em ${c.daysFromToday} dia(s)`;
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0"
                      style={{ backgroundColor: c.role?.bgColor ?? "#fce7f3", color: c.role?.color ?? "#be185d" }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                        {c.role && <RoleBadge role={c.role} />}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${hoje ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600"}`}>
                          {dataLabel}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {String(c.birthDay).padStart(2, "0")}/{String(c.birthMonth).padStart(2, "0")} · {c.willTurn} anos
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        {displayPhone(c.phone) && <span className="flex items-center gap-1"><Phone size={10} />{displayPhone(c.phone)}</span>}
                        {c.cidade && <span className="flex items-center gap-1"><MapPin size={10} />{c.cidade}</span>}
                        {c.parent && <span>Líder: {c.parent.name}</span>}
                      </div>
                    </div>

                    {sent ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg shrink-0">
                        <Check size={11} /> Enviada {format(new Date(c.sentThisYear.sentAt), "dd/MM HH:mm")}
                      </span>
                    ) : (
                      <>
                        <button onClick={() => setPreviewCc(c)}
                          className="text-[11px] text-gray-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 shrink-0 opacity-0 group-hover:opacity-100">
                          Prévia
                        </button>
                        <button onClick={() => send(c)} disabled={sending === c.id || !template.trim()}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-lg font-medium shrink-0">
                          <Send size={12} /> {sending === c.id ? "Enviando..." : (hoje ? "Enviar" : "Adiantar")}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!template.trim() && items.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Escreva uma mensagem padrão acima antes de enviar.</span>
            </div>
          )}
        </div>
      </div>

      {/* Prévia */}
      {previewCc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewCc(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Cake size={16} className="text-pink-500" /> Prévia para {previewCc.name}
            </h3>
            <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap mb-4">
              {previewMessage(previewCc) || <span className="text-gray-400 italic">(template vazio)</span>}
            </div>
            <p className="text-xs text-gray-400 mb-4">Telefone: {displayPhone(previewCc.phone) ?? "—"}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPreviewCc(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Fechar</button>
              <button onClick={() => { send(previewCc); setPreviewCc(null); }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium">
                <Send size={13} /> Enviar mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
