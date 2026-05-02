"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Settings, Users, Clock, CheckCheck, Plus, Trash2,
  Search, X, Image as ImageIcon, MessageSquare, Tag, Save,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── ContactSearch ───────────────────────────────────────────────────────────

function ContactSearch({ onSelect, placeholder = "Buscar contato..." }: { onSelect: (c: any) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function search(v: string) {
    setQ(v); clearTimeout(timer.current);
    if (!v.trim()) { setRes([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(v)}&limit=8`);
      const d = await r.json();
      setRes(d.contacts ?? []); setOpen(true);
    }, 280);
  }

  return (
    <div className="relative" ref={ref}>
      <input value={q} onChange={e => search(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {open && res.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-50">
          {res.map(c => (
            <div key={c.id} onClick={() => { onSelect(c); setQ(""); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Adicionar contatos ──────────────────────────────────────────────────────

function MultiToggle({ options, selected, onToggle }: {
  options: { value: string; label: string; count?: number; color?: string; bgColor?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return <p className="text-xs text-gray-400 italic">Nenhuma opção</p>;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => {
        const isOn = selected.includes(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => onToggle(opt.value)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${isOn ? "bg-brand-600 text-white border-transparent" : "text-gray-600 border-gray-200 bg-white hover:border-brand-300"}`}
            style={isOn && opt.color ? { backgroundColor: opt.color, color: "#fff" } : {}}>
            {opt.label}{opt.count !== undefined && <span className="opacity-60 ml-1">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function MultiSearchPicker({ options, selected, onChange, placeholder }: {
  options: { value: string; count?: number }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter(o => o.value.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <Search size={12} className="text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder ?? "Filtrar..."}
          className="flex-1 text-xs bg-transparent focus:outline-none" />
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-[10px] text-red-400 hover:text-red-600">limpar ({selected.length})</button>
        )}
      </div>
      <div className="max-h-40 overflow-y-auto bg-white">
        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Nada encontrado</p>}
        {filtered.slice(0, 100).map(o => {
          const isOn = selected.includes(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={isOn} onChange={() => toggle(o.value)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span className="flex-1 text-gray-700">{o.value}</span>
              {o.count !== undefined && <span className="text-[10px] text-gray-400">{o.count}</span>}
            </label>
          );
        })}
        {filtered.length > 100 && <p className="px-3 py-2 text-xs text-gray-400 italic">+{filtered.length - 100} resultados — refine a busca</p>}
      </div>
    </div>
  );
}

function AddContactsModal({ campaignId, onClose, onAdded }: any) {
  const [origem, setOrigem] = useState<"criterio" | "avancado" | "manual">("criterio");
  const [picked, setPicked] = useState<any[]>([]);

  // Critério (simples)
  const [opts, setOpts] = useState<any | null>(null);
  const [roleKeys, setRoleKeys] = useState<string[]>([]);
  const [excludeInAnyCampaign, setExcludeInAnyCampaign] = useState(false);

  // Filtro avançado
  const [advRoleKeys, setAdvRoleKeys] = useState<string[]>([]);
  const [advCidades, setAdvCidades]   = useState<string[]>([]);
  const [advBairros, setAdvBairros]   = useState<string[]>([]);
  const [advExclude, setAdvExclude]   = useState(false);

  const [preview, setPreview] = useState<{ total: number; novos: number; jaNaCampanha: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch("/api/contacts/filter-options").then(r => r.json()).then(setOpts);
  }, []);

  function buildBody() {
    const body: any = {};
    if (origem === "manual") body.contactIds = picked.map(p => p.id);
    if (origem === "criterio") {
      if (roleKeys.length) body.roleKeys = roleKeys;
      body.excludeInAnyCampaign = excludeInAnyCampaign;
    }
    if (origem === "avancado") {
      if (advRoleKeys.length) body.roleKeys = advRoleKeys;
      if (advCidades.length)  body.cidades  = advCidades;
      if (advBairros.length)  body.bairros  = advBairros;
      body.excludeInAnyCampaign = advExclude;
    }
    return body;
  }

  // Auto-preview
  useEffect(() => {
    clearTimeout(previewTimer.current);
    if (origem === "manual") { setPreview(null); return; }
    if (origem === "criterio" && roleKeys.length === 0) { setPreview(null); return; }
    if (origem === "avancado" && advRoleKeys.length === 0 && advCidades.length === 0 && advBairros.length === 0) { setPreview(null); return; }
    previewTimer.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const r = await fetch(`/api/campaigns/${campaignId}/contacts/preview`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody()),
        });
        setPreview(await r.json());
      } finally { setPreviewing(false); }
    }, 350);
    return () => clearTimeout(previewTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem, roleKeys, excludeInAnyCampaign, advRoleKeys, advCidades, advBairros, advExclude]);

  function toggle<T>(arr: T[], v: T): T[] { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }

  async function add() {
    setSaving(true);
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`${d.added} adicionados${d.skipped ? ` · ${d.skipped} já estavam` : ""}`);
      onAdded(); onClose();
    } finally { setSaving(false); }
  }

  const canAdd = origem === "manual" ? picked.length > 0 : (preview?.novos ?? 0) > 0;

  return (
    <Modal open title="Adicionar contatos à campanha" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5">
          {([
            { key: "criterio", label: "Por Critério" },
            { key: "avancado", label: "Filtro Avançado" },
            { key: "manual",   label: "Manual"        },
          ] as const).map(m => (
            <button key={m.key} type="button" onClick={() => setOrigem(m.key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${origem === m.key ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {m.label}
            </button>
          ))}
        </div>

        {origem === "manual" && (
          <>
            <ContactSearch onSelect={(c) => {
              if (picked.find(p => p.id === c.id)) return;
              setPicked(prev => [...prev, c]);
            }} placeholder="Buscar e adicionar contatos..." />
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {picked.map(c => (
                  <div key={c.id} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
                    <span className="text-xs text-indigo-900">{c.name}</span>
                    <button type="button" onClick={() => setPicked(prev => prev.filter(p => p.id !== c.id))}
                      className="text-indigo-300 hover:text-red-400"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {origem === "criterio" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Papéis</p>
              <MultiToggle
                options={(opts?.roles ?? []).map((r: any) => ({ value: r.key, label: r.label, count: r.count, color: r.color, bgColor: r.bgColor }))}
                selected={roleKeys}
                onToggle={(v) => setRoleKeys(prev => toggle(prev, v))}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={excludeInAnyCampaign} onChange={e => setExcludeInAnyCampaign(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Excluir contatos que já estão em <strong>outra</strong> campanha
            </label>
          </div>
        )}

        {origem === "avancado" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 italic">Combine quantos filtros quiser. Os critérios são aplicados em conjunto (E).</p>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Papéis</p>
              <MultiToggle
                options={(opts?.roles ?? []).map((r: any) => ({ value: r.key, label: r.label, count: r.count, color: r.color, bgColor: r.bgColor }))}
                selected={advRoleKeys}
                onToggle={(v) => setAdvRoleKeys(prev => toggle(prev, v))}
              />
            </div>
            {(opts?.cidades ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Cidades</p>
                <MultiSearchPicker
                  options={opts.cidades.map((c: any) => ({ value: c.value, count: c.count }))}
                  selected={advCidades}
                  onChange={setAdvCidades}
                  placeholder="Filtrar cidades..."
                />
              </div>
            )}
            {(opts?.bairros ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Bairros</p>
                <MultiSearchPicker
                  options={opts.bairros.map((b: any) => ({ value: b.value, count: b.count }))}
                  selected={advBairros}
                  onChange={setAdvBairros}
                  placeholder="Filtrar bairros..."
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={advExclude} onChange={e => setAdvExclude(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Excluir contatos que já estão em <strong>outra</strong> campanha
            </label>
          </div>
        )}

        {/* Preview */}
        {origem !== "manual" && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            {previewing ? (
              <p className="text-xs text-gray-400">Calculando...</p>
            ) : preview ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-3">
                  <span className="text-gray-700"><strong className="text-brand-700 text-lg">{preview.novos}</strong> novos</span>
                  {preview.jaNaCampanha > 0 && <span className="text-gray-400">{preview.jaNaCampanha} já estão</span>}
                  <span className="text-gray-400">de {preview.total} encontrados</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Selecione critérios para ver quantos contatos serão adicionados</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={add} disabled={!canAdd || saving}
            className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Adicionando..." : origem === "manual" ? `Adicionar ${picked.length}` : preview ? `Adicionar ${preview.novos}` : "Adicionar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de envio em LOTE ──────────────────────────────────────────────────

function BatchSendModal({ campaign, totalPendentes, onClose, onStarted }: any) {
  const [count, setCount] = useState(Math.min(50, totalPendentes));
  const [delaySec, setDelaySec] = useState(3);
  const [sending, setSending] = useState(false);

  const minutes = Math.round((count * delaySec) / 60);

  async function start() {
    setSending(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/batch-send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, delayMs: delaySec * 1000 }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`Lote de ${d.batched} envios iniciado em background!`);
      onStarted(); onClose();
    } finally { setSending(false); }
  }

  return (
    <Modal open title="Enviar lote" onClose={onClose} size="md">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-gray-600">
          Há <strong>{totalPendentes}</strong> contatos pendentes nesta campanha.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantos enviar agora?</label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={totalPendentes} value={count}
              onChange={e => setCount(Math.max(1, Math.min(totalPendentes, Number(e.target.value) || 1)))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input type="range" min={1} max={totalPendentes} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="flex-1 accent-brand-600" />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[10, 50, 100, 250, 500, 1000].filter(n => n <= totalPendentes).map(n => (
              <button key={n} onClick={() => setCount(n)}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-300">
                {n}
              </button>
            ))}
            {totalPendentes <= 1000 && (
              <button onClick={() => setCount(totalPendentes)}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-300">
                Todos ({totalPendentes})
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo entre envios</label>
          <div className="flex gap-1.5 flex-wrap">
            {[2, 3, 5, 8, 12, 20].map(s => (
              <button key={s} onClick={() => setDelaySec(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${delaySec === s ? "bg-brand-600 text-white border-transparent" : "text-gray-600 border-gray-200 bg-white"}`}>
                {s}s
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Mais lento = menos risco de bloqueio do WhatsApp</p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
          <p>Estimativa: <strong>~{minutes} min</strong> para concluir o lote.</p>
          <p className="mt-1">O envio roda em background — você pode fechar essa janela.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={start} disabled={sending || count < 1}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            <Send size={14} /> {sending ? "Iniciando..." : `Enviar ${count}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// (Envio individual removido — apenas envio em lote agora)

// ─── Configuração ────────────────────────────────────────────────────────────

const VARIABLES = [
  { key: "primeiroNome",  label: "Primeiro nome" },
  { key: "nome",          label: "Nome completo" },
  { key: "primeiroLider", label: "Primeiro nome do líder" },
  { key: "lider",         label: "Líder (completo)"        },
  { key: "telefone",      label: "Telefone" },
];

function ConfigTab({ campaign, onSaved }: any) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [goal, setGoal] = useState(campaign.goal ?? "");
  const [status, setStatus] = useState(campaign.status);
  const [messageTemplate, setMessageTemplate] = useState(campaign.messageTemplate);
  const [mediaUrl, setMediaUrl] = useState<string | null>(campaign.mediaUrl);
  const [mediaType, setMediaType] = useState<string | null>(campaign.mediaType);
  const [linkUrl, setLinkUrl] = useState(campaign.linkUrl ?? "");
  const [tags, setTags] = useState(campaign.responseTags ?? []);
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(key: string) {
    const placeholder = `{{${key}}}`;
    const ta = textareaRef.current;
    if (!ta) { setMessageTemplate((prev: string) => prev + placeholder); return; }
    const start = ta.selectionStart ?? messageTemplate.length;
    const end   = ta.selectionEnd   ?? messageTemplate.length;
    const next  = messageTemplate.slice(0, start) + placeholder + messageTemplate.slice(end);
    setMessageTemplate(next);
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
    const ta = textareaRef.current;
    const placeholder = `{{${key}}}`;
    if (!ta) { setMessageTemplate((prev: string) => prev + placeholder); return; }
    // Insere na posição do cursor (que muda quando arrasta)
    const start = ta.selectionStart ?? messageTemplate.length;
    const end   = ta.selectionEnd   ?? messageTemplate.length;
    const next  = messageTemplate.slice(0, start) + placeholder + messageTemplate.slice(end);
    setMessageTemplate(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + placeholder.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function uploadMedia(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/campaigns/upload", { method: "POST", body: fd });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      setMediaUrl(d.url); setMediaType(d.type);
      toast.success("Mídia carregada");
    } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, goal, status, messageTemplate, mediaUrl, mediaType, linkUrl: linkUrl || null }),
      });
      if (!r.ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Salvo");
      onSaved();
    } finally { setSaving(false); }
  }

  async function addTag() {
    if (!newTag.trim()) return;
    const r = await fetch(`/api/campaigns/${campaign.id}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newTag }),
    });
    if (!r.ok) { toast.error("Erro"); return; }
    const tag = await r.json();
    setTags((prev: any[]) => [...prev, tag]);
    setNewTag("");
  }

  async function delTag(id: string) {
    await fetch(`/api/campaigns/${campaign.id}/tags/${id}`, { method: "DELETE" });
    setTags((prev: any[]) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Informações</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Objetivo"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
        <div className="flex gap-1.5">
          {(["ATIVA", "PAUSADA", "CONCLUIDA"] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${status === s ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {s === "ATIVA" ? "Ativa" : s === "PAUSADA" ? "Pausada" : "Concluída"}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Mensagem padrão</h3>

        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1.5">Campos personalizados — arraste ou clique para inserir</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button key={v.key} type="button"
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/variable", v.key); e.dataTransfer.effectAllowed = "copy"; }}
                onClick={() => insertVariable(v.key)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 hover:bg-indigo-100 cursor-grab active:cursor-grabbing select-none">
                <span className="text-[10px] opacity-60">⋮⋮</span>
                <span className="font-mono">{`{{${v.key}}}`}</span>
                <span className="text-[10px] text-indigo-400">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea ref={textareaRef} rows={6} value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)}
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          placeholder="Digite a mensagem... arraste ou clique nos campos acima para inserir variáveis"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[11px] text-amber-700">
          <strong>Atenção:</strong> se um contato não tiver valor para alguma variável usada (ex: <code>{"{{lider}}"}</code> sem líder atribuído), a mensagem dele <strong>não será enviada</strong> — ele entra em "Processados" como ignorado, com o motivo registrado.
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><ImageIcon size={14} /> Mídia (opcional)</h3>
        {mediaUrl ? (
          <div className="flex items-center gap-3">
            {mediaType === "video"
              ? <video src={mediaUrl} className="w-32 h-32 rounded-lg object-cover" controls />
              : <img src={mediaUrl} alt="" className="w-32 h-32 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="text-xs text-gray-500 truncate">{mediaUrl}</p>
              <button onClick={() => { setMediaUrl(null); setMediaType(null); }}
                className="text-xs text-red-500 hover:underline mt-2">Remover</button>
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer text-sm text-gray-500 hover:bg-gray-50">
            <input type="file" accept="image/*,video/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
            {uploading ? "Enviando..." : "Clique para carregar imagem ou vídeo (até 25MB)"}
          </label>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Link com prévia (opcional)</label>
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://instagram.com/..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Tag size={14} /> Tags de resposta</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((t: any) => (
            <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ color: t.color, backgroundColor: t.bgColor, borderColor: t.color + "40" }}>
              {t.label}
              <button onClick={() => delTag(t.id)} className="opacity-50 hover:opacity-100"><X size={11} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Nova tag..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={addTag} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} />
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          <Save size={14} /> {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

// ─── Linha de contato ────────────────────────────────────────────────────────

function ContactRow({ cc, campaign, tags, onPatch, onDelete }: any) {
  const router = useRouter();
  const [showTags, setShowTags] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);
  const tag = cc.responseTag;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!tagRef.current?.contains(e.target as Node)) setShowTags(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 text-sm truncate">{cc.contact.name}</p>
          {cc.contact.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ color: cc.contact.role.color, backgroundColor: cc.contact.role.bgColor }}>
              {cc.contact.role.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          <span>{cc.contact.phone}</span>
          {(cc.assignedTo?.name || cc.contact.parent?.name) && (
            <span>Líder: {cc.assignedTo?.name ?? cc.contact.parent?.name}</span>
          )}
          {cc.sentAt && <span>Enviado {format(new Date(cc.sentAt), "dd/MM HH:mm")}</span>}
        </div>
      </div>

      {tag && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ color: tag.color, backgroundColor: tag.bgColor }}>{tag.label}</span>
      )}

      {cc.status === "PENDENTE" && (
        <span className="text-[11px] text-gray-400 shrink-0">aguardando lote</span>
      )}

      {cc.status !== "PENDENTE" && tags.length > 0 && (
        <div className="relative" ref={tagRef}>
          <button onClick={() => setShowTags(s => !s)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs shrink-0">
            <Tag size={11} /> {tag ? "Mudar tag" : "Etiquetar"}
          </button>
          {showTags && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56 max-h-60 overflow-y-auto">
              {tags.map((t: any) => (
                <button key={t.id} onClick={() => { onPatch(cc.id, { responseTagId: t.id, status: "RESPONDEU" }); setShowTags(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>{t.label}</span>
                </button>
              ))}
              {tag && (
                <button onClick={() => { onPatch(cc.id, { responseTagId: null }); setShowTags(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-left text-red-500 border-t border-gray-100 mt-1 pt-1.5">
                  <X size={11} /> Remover tag
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => router.push(`/conversas?contactId=${cc.contactId}`)}
        title="Abrir conversa" className="p-1.5 text-gray-400 hover:text-brand-600 shrink-0">
        <MessageSquare size={14} />
      </button>
      <button onClick={() => onDelete(cc.id)} title="Remover da campanha"
        className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Aba Reuniões ────────────────────────────────────────────────────────────

function ReunioesTab({ campaignId, onAdded }: { campaignId: string; onAdded: () => void }) {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/reunioes").then(r => r.json()).then(d => { setReunioes(d); setLoading(false); });
  }, []);

  async function add(reuniaoId: string, mode: "all" | "anfitrioes" | "presentes") {
    setAdding(reuniaoId + mode);
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuniaoId, mode }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      const d = await r.json();
      toast.success(`${d.added} contatos adicionados${d.skipped ? ` · ${d.skipped} já estavam` : ""}`);
      onAdded();
    } finally { setAdding(null); }
  }

  const filtered = reunioes.filter(r => !search.trim() || r.titulo?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <p className="text-sm text-gray-500 mb-4">Adicione contatos a partir de reuniões realizadas. Escolha o modo (todos, só anfitriões, ou presentes sem anfitriões).</p>
      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reunião..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      {loading ? (
        <p className="text-center text-gray-400 py-10">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users size={36} className="mb-3 opacity-30" />
          <p className="font-medium">Nenhuma reunião encontrada</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map(r => {
            const totPres = r._count?.presentes ?? 0;
            const totAnf  = r.anfitrioes?.length ?? 0;
            return (
              <div key={r.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{r.titulo}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{format(new Date(r.dataHora), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span>{totPres} presentes</span>
                    <span>{totAnf} anfitriões</span>
                    {r.local && <span className="truncate">{r.local}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button disabled={!!adding} onClick={() => add(r.id, "all")}
                    className="text-xs px-2.5 py-1.5 border border-gray-200 hover:border-brand-400 hover:text-brand-600 rounded-lg disabled:opacity-50">
                    {adding === r.id + "all" ? "..." : "Todos"}
                  </button>
                  <button disabled={!!adding} onClick={() => add(r.id, "anfitrioes")}
                    className="text-xs px-2.5 py-1.5 border border-gray-200 hover:border-amber-400 hover:text-amber-600 rounded-lg disabled:opacity-50">
                    {adding === r.id + "anfitrioes" ? "..." : "Anfitriões"}
                  </button>
                  <button disabled={!!adding} onClick={() => add(r.id, "presentes")}
                    className="text-xs px-2.5 py-1.5 border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg disabled:opacity-50">
                    {adding === r.id + "presentes" ? "..." : "Presentes"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function CampanhaDetailPage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;
  const [campaign, setCampaign] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [tab, setTab] = useState<"PENDENTE" | "ENVIADO" | "REUNIOES" | "CONFIG">("PENDENTE");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const loadCampaign = useCallback(async () => {
    const r = await fetch(`/api/campaigns/${id}`);
    if (r.ok) setCampaign(await r.json());
  }, [id]);

  const loadContacts = useCallback(async () => {
    const r = await fetch(`/api/campaigns/${id}/contacts?limit=500`);
    const d = await r.json();
    setContacts(d.items ?? []);
    setContactsTotal(d.total ?? 0);
  }, [id]);

  useEffect(() => { loadCampaign(); loadContacts(); }, [loadCampaign, loadContacts]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("campaigns", () => { loadCampaign(); loadContacts(); });
    return () => es.close();
  }, [loadCampaign, loadContacts]);

  async function patchContact(ccId: string, data: any) {
    await fetch(`/api/campaigns/${id}/contacts/${ccId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadContacts();
  }

  async function deleteContact(ccId: string) {
    if (!confirm("Remover este contato da campanha?")) return;
    await fetch(`/api/campaigns/${id}/contacts/${ccId}`, { method: "DELETE" });
    loadContacts();
  }

  const pendentes = useMemo(() => contacts.filter(c => c.status === "PENDENTE"), [contacts]);
  const processados = useMemo(() => contacts.filter(c => c.status !== "PENDENTE"), [contacts]);

  const filterFn = (cc: any) => !search.trim() ||
    cc.contact.name?.toLowerCase().includes(search.toLowerCase()) ||
    cc.contact.phone?.includes(search);

  if (!campaign) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <Link href="/campanhas" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h1>
            {campaign.goal && <p className="text-sm text-gray-500 truncate">{campaign.goal}</p>}
          </div>
          {(campaign.counts?.PENDENTE ?? 0) > 0 && (
            <button onClick={() => setBatchOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Send size={15} /> Enviar lote
            </button>
          )}
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Adicionar contatos
          </button>
        </div>
        <div className="flex gap-1 px-6 overflow-x-auto">
          {[
            { key: "PENDENTE", label: "Pendentes",  icon: Clock,     count: campaign.counts?.PENDENTE ?? 0 },
            { key: "ENVIADO",  label: "Processados", icon: CheckCheck, count: (campaign.counts?.ENVIADO ?? 0) + (campaign.counts?.RESPONDEU ?? 0) + (campaign.counts?.IGNOROU ?? 0) },
            { key: "REUNIOES", label: "Reuniões",   icon: Users,      count: null },
            { key: "CONFIG",   label: "Configuração", icon: Settings, count: null },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon size={14} /> {t.label}
                {t.count !== null && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {(tab === "PENDENTE" || tab === "ENVIADO") && (
        <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "PENDENTE" && (
          <div className="max-w-4xl mx-auto p-6">
            {pendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Users size={36} className="mb-3 opacity-30" />
                <p className="font-medium">Nenhum contato pendente</p>
                <p className="text-sm mt-1">Adicione contatos para começar a campanha</p>
              </div>
            ) : (
              <>
                {contactsTotal > contacts.length && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                    Mostrando {contacts.length} de {contactsTotal} contatos. Use a busca para filtrar ou envie em lote.
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {pendentes.filter(filterFn).map(cc => (
                    <ContactRow key={cc.id} cc={cc} campaign={campaign} tags={campaign.responseTags ?? []}
                      onPatch={patchContact} onDelete={deleteContact} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "ENVIADO" && (
          <div className="max-w-4xl mx-auto p-6">
            {processados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <CheckCheck size={36} className="mb-3 opacity-30" />
                <p className="font-medium">Ninguém foi processado ainda</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {processados.filter(filterFn).map(cc => (
                  <ContactRow key={cc.id} cc={cc} campaign={campaign} tags={campaign.responseTags ?? []}
                    onPatch={patchContact} onDelete={deleteContact} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "REUNIOES" && (
          <ReunioesTab campaignId={id} onAdded={() => { loadContacts(); loadCampaign(); }} />
        )}

        {tab === "CONFIG" && (
          <div className="p-6">
            <ConfigTab campaign={campaign} onSaved={loadCampaign} />
          </div>
        )}
      </div>

      {addOpen && <AddContactsModal campaignId={id} onClose={() => setAddOpen(false)} onAdded={() => { loadContacts(); loadCampaign(); }} />}
      {batchOpen && <BatchSendModal campaign={campaign} totalPendentes={campaign.counts?.PENDENTE ?? 0} onClose={() => setBatchOpen(false)} onStarted={() => { loadContacts(); loadCampaign(); }} />}
    </div>
  );
}
