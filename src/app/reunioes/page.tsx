"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, Users, MapPin, Calendar, Clock,
  Trash2, Edit2, Star, X, Home,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INP = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  AGENDADA:  { label: "Agendada",  color: "#4f46e5", bg: "#eef2ff" },
  REALIZADA: { label: "Realizada", color: "#059669", bg: "#d1fae5" },
  CANCELADA: { label: "Cancelada", color: "#dc2626", bg: "#fee2e2" },
};

// ─── ContactSearch ─────────────────────────────────────────────────────────────

function ContactSearch({ placeholder = "Buscar contato...", onSelect }: {
  placeholder?: string; onSelect: (c: any) => void;
}) {
  const [q, setQ]     = useState("");
  const [res, setRes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref   = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function search(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    if (!v.trim()) { setRes([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(v)}&limit=8`);
      const d = await r.json();
      setRes(d.contacts ?? []);
      setOpen(true);
    }, 280);
  }

  function pick(c: any) { onSelect(c); setQ(""); setOpen(false); setRes([]); }

  return (
    <div className="relative" ref={ref}>
      <input value={q} onChange={e => search(e.target.value)} placeholder={placeholder} className={INP} />
      {open && res.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
          {res.map(c => (
            <div key={c.id} onClick={() => pick(c)} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
              {c.role && <RoleBadge role={c.role} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NumberRating ──────────────────────────────────────────────────────────────

function NumberRating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
            value === i
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}>
          {i}
        </button>
      ))}
    </div>
  );
}

// ─── ContactChip ───────────────────────────────────────────────────────────────

function ContactChip({ contact, label, onRemove }: { contact: any; label?: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5">
      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
        {contact.name?.[0]?.toUpperCase()}
      </div>
      <span className="text-xs font-medium text-indigo-900 truncate max-w-28">{contact.name}</span>
      {label && <span className="text-[10px] text-indigo-400">{label}</span>}
      <button type="button" onClick={onRemove} className="text-indigo-300 hover:text-red-400 ml-0.5"><X size={11} /></button>
    </div>
  );
}

// ─── ReuniaoForm ──────────────────────────────────────────────────────────────

function ReuniaoForm({ initial, onSave, onClose }: { initial?: any; onSave: (r: any) => void; onClose: () => void }) {
  const [titulo,  setTitulo]  = useState(initial?.titulo  ?? "");
  const [dataHora, setDataHora] = useState(
    initial?.dataHora ? (() => { const d = new Date(initial.dataHora); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })() : ""
  );
  const [local,   setLocal]   = useState(initial?.local   ?? "");
  const [bairro,  setBairro]  = useState(initial?.bairro  ?? "");
  const [zona,    setZona]    = useState(initial?.zona    ?? "");
  const [status,  setStatus]  = useState(initial?.status  ?? "REALIZADA");
  const [notes,   setNotes]   = useState(initial?.notes   ?? "");

  const [lider, setLider] = useState<any | null>(initial?.lider ?? null);

  // Anfitriões: agora aceita base e manual — mesmo shape dos presentes
  const [anfitrioes, setAnfitrioes] = useState<any[]>(
    initial?.anfitrioes?.map((a: any, i: number) => ({
      _key: `a${i}`, contactId: a.contactId, contact: a.contact,
    })) ?? []
  );
  const [anfMode, setAnfMode] = useState<"base" | "manual">("base");
  const [anfNome, setAnfNome] = useState("");
  const [anfTel,  setAnfTel]  = useState("");

  // Presentes
  const [presentes, setPresentes] = useState<any[]>(
    initial?.presentes?.map((p: any, i: number) => ({
      _key: `p${i}`, contactId: p.contactId, contact: p.contact, nome: p.nome, telefone: p.telefone,
    })) ?? []
  );
  const [presMode,    setPresMode]    = useState<"base" | "manual">("base");
  const [presNome,    setPresNome]    = useState("");
  const [presTel,     setPresTel]     = useState("");

  // Avaliações: 3 slots, anônimas
  const initAval = (slot: number) => {
    const found = initial?.avaliacoes?.find((a: any) => a.slot === slot);
    return { slot, atencao: found?.atencao ?? 0, interacao: found?.interacao ?? 0 };
  };
  const [aval, setAval] = useState([initAval(1), initAval(2), initAval(3)]);

  const [saving, setSaving] = useState(false);
  const nextKey = useRef(0);
  const newKey = (prefix: string) => `${prefix}${Date.now()}-${nextKey.current++}`;

  function addPresenteBase(contact: any) {
    if (presentes.find(p => p.contactId === contact.id)) return;
    setPresentes(prev => [...prev, { _key: newKey("p"), contactId: contact.id, contact }]);
  }
  function addPresenteManual() {
    if (!presTel.trim() && !presNome.trim()) return;
    setPresentes(prev => [...prev, { _key: newKey("pm"), nome: presNome.trim(), telefone: presTel.trim() }]);
    setPresNome(""); setPresTel("");
  }

  function addAnfitriaoBase(contact: any) {
    if (anfitrioes.find(a => a.contactId === contact.id)) return;
    setAnfitrioes(prev => [...prev, { _key: newKey("a"), contactId: contact.id, contact }]);
    addPresenteBase(contact);
  }
  function addAnfitriaoManual() {
    if (!anfTel.trim() && !anfNome.trim()) return;
    const entry = { nome: anfNome.trim(), telefone: anfTel.trim() };
    setAnfitrioes(prev => [...prev, { _key: newKey("am"), ...entry }]);
    setPresentes(prev => [...prev, { _key: newKey("pm"), ...entry }]);
    setAnfNome(""); setAnfTel("");
  }

  function updateAval(slot: number, patch: any) {
    setAval(prev => prev.map(a => a.slot === slot ? { ...a, ...patch } : a));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !dataHora) { toast.error("Título e data são obrigatórios"); return; }
    setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url    = initial?.id ? `/api/reunioes/${initial.id}` : "/api/reunioes";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo, dataHora: new Date(dataHora).toISOString(),
          local, bairro, zona, status, notes,
          liderId: lider?.id ?? null,
          anfitrioes: anfitrioes.map(a => ({ contactId: a.contactId ?? null, nome: a.nome ?? null, telefone: a.telefone ?? null })),
          presentes:  presentes.map(p =>  ({ contactId: p.contactId ?? null, nome: p.nome ?? null, telefone: p.telefone ?? null })),
          avaliacoes: aval.map(a => ({ slot: a.slot, atencao: a.atencao, interacao: a.interacao })),
        }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success(initial?.id ? "Reunião atualizada!" : "Reunião criada!");
      onSave(await r.json());
    } finally { setSaving(false); }
  }

  const anfIds = new Set(anfitrioes.filter(a => a.contactId).map(a => a.contactId));
  const anfPhones = new Set(anfitrioes.filter(a => !a.contactId && a.telefone).map(a => a.telefone));

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">

      {/* Informações básicas */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2.5">Informações básicas</h3>
        <div className="flex flex-col gap-2.5">
          <input required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título da reunião *" className={INP} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1"><Calendar size={11} className="inline mr-1" />Data e hora *</label>
              <input type="datetime-local" value={dataHora} onChange={e => setDataHora(e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setStatus(k)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${status === k ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-500"}`}
                    style={status === k ? { backgroundColor: v.color } : {}}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1"><MapPin size={11} className="inline mr-1" />Local</label>
              <input value={local} onChange={e => setLocal(e.target.value)} placeholder="Endereço" className={INP} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bairro</label>
              <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Zona</label>
              <select value={zona} onChange={e => setZona(e.target.value)} className={`${INP} bg-white`}>
                <option value="">—</option>
                <option>Urbano</option>
                <option>Rural</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notas</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações" className={INP} />
            </div>
          </div>
        </div>
      </section>

      {/* Líder */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2.5">Líder da Reunião</h3>
        {lider ? (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
              {lider.name?.[0]?.toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium text-indigo-900">{lider.name}</span>
            {lider.role && <RoleBadge role={lider.role} />}
            <button type="button" onClick={() => setLider(null)} className="text-indigo-300 hover:text-red-400"><X size={14} /></button>
          </div>
        ) : (
          <ContactSearch placeholder="Buscar líder na base..." onSelect={setLider} />
        )}
      </section>

      {/* Anfitriões da casa — base ou manual */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          <Home size={11} className="inline mr-1" />Anfitriões da Casa
        </h3>
        <div className="flex gap-1.5 mb-2">
          {(["base", "manual"] as const).map(m => (
            <button key={m} type="button" onClick={() => setAnfMode(m)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${anfMode === m ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {m === "base" ? "Da base" : "Número novo"}
            </button>
          ))}
        </div>

        {anfMode === "base" ? (
          <ContactSearch placeholder="Buscar anfitrião na base..." onSelect={addAnfitriaoBase} />
        ) : (
          <div className="flex gap-2">
            <input value={anfNome} onChange={e => setAnfNome(e.target.value)} placeholder="Nome" className={`${INP} flex-1`} />
            <input value={anfTel}  onChange={e => setAnfTel(e.target.value)}  placeholder="Telefone" className={`${INP} flex-1`} />
            <button type="button" onClick={addAnfitriaoManual} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} />
            </button>
          </div>
        )}

        {anfitrioes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {anfitrioes.map(a => (
              <div key={a._key} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <Home size={11} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-900 truncate max-w-32">
                  {a.contact?.name ?? a.nome ?? "—"}
                </span>
                {(a.contact?.phone ?? a.telefone) && (
                  <span className="text-[10px] text-amber-500">{a.contact?.phone ?? a.telefone}</span>
                )}
                <button type="button"
                  onClick={() => {
                    setAnfitrioes(prev => prev.filter(x => x._key !== a._key));
                    // Remove o presente correspondente também
                    setPresentes(prev => prev.filter(p => {
                      if (a.contactId && p.contactId === a.contactId) return false;
                      if (!a.contactId && p.telefone === a.telefone && p.nome === a.nome) return false;
                      return true;
                    }));
                  }}
                  className="text-amber-300 hover:text-red-400 ml-0.5"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lista de Presentes */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          <Users size={11} className="inline mr-1" />Lista de Presentes ({presentes.length})
        </h3>
        <div className="flex gap-1.5 mb-2">
          {(["base", "manual"] as const).map(m => (
            <button key={m} type="button" onClick={() => setPresMode(m)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${presMode === m ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {m === "base" ? "Da base" : "Número novo"}
            </button>
          ))}
        </div>

        {presMode === "base" ? (
          <ContactSearch placeholder="Buscar contato para adicionar..." onSelect={addPresenteBase} />
        ) : (
          <div className="flex gap-2">
            <input value={presNome} onChange={e => setPresNome(e.target.value)} placeholder="Nome" className={`${INP} flex-1`} />
            <input value={presTel}  onChange={e => setPresTel(e.target.value)}  placeholder="Telefone" className={`${INP} flex-1`} />
            <button type="button" onClick={addPresenteManual} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} />
            </button>
          </div>
        )}

        {presentes.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg divide-y divide-gray-100 border border-gray-200">
            {presentes.map(p => {
              const isAnf = (p.contactId && anfIds.has(p.contactId)) ||
                            (!p.contactId && p.telefone && anfPhones.has(p.telefone));
              return (
                <div key={p._key} className="flex items-center gap-2 px-3 py-2">
                  {isAnf && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">anfitrião</span>
                  )}
                  <p className="flex-1 text-xs font-medium text-gray-800 truncate">
                    {p.contact?.name ?? p.nome ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">{p.contact?.phone ?? p.telefone ?? ""}</p>
                  <button type="button" onClick={() => setPresentes(prev => prev.filter(x => x._key !== p._key))}
                    className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Avaliações — sem obs, escala 0-5 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2.5">
          <Star size={11} className="inline mr-1" />Avaliações da Equipe
        </h3>
        <div className="flex flex-col gap-3">
          {aval.map(a => (
            <div key={a.slot} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Avaliação {a.slot}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Atenção</p>
                  <NumberRating value={a.atencao} onChange={v => updateAval(a.slot, { atencao: v })} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Interação</p>
                  <NumberRating value={a.interacao} onChange={v => updateAval(a.slot, { interacao: v })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-5 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
          {saving ? "Salvando..." : (initial?.id ? "Atualizar" : "Criar Reunião")}
        </button>
      </div>
    </form>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ReunioesPage() {
  const [reunioes, setReunioes]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState<"novo" | "editar" | null>(null);
  const [selected, setSelected]   = useState<any | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/reunioes${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setReunioes(await r.json());
    } finally { if (!silent) setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("reunioes", () => load(true));
    return () => es.close();
  }, [load]);

  async function del(r: any) {
    if (!confirm(`Excluir "${r.titulo}"?`)) return;
    await fetch(`/api/reunioes/${r.id}`, { method: "DELETE" });
    toast.success("Reunião excluída");
    load(true);
  }

  function closeModal() { setModal(null); setSelected(null); }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reuniões</h1>
          <p className="text-sm text-gray-500">{reunioes.length} reuniões registradas</p>
        </div>
        <button onClick={() => { setSelected(null); setModal("novo"); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15} /> Nova Reunião
        </button>
      </header>

      {/* Busca */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reunião..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reunioes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Nenhuma reunião registrada</p>
            <p className="text-sm mt-1">Crie a primeira reunião clicando em Nova Reunião</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-4xl mx-auto">
            {reunioes.map(r => {
              const st = STATUS_CFG[r.status] ?? STATUS_CFG.REALIZADA;
              const avgAval = r.avaliacoes?.length > 0
                ? (r.avaliacoes.reduce((s: number, a: any) => s + (a.atencao + a.interacao) / 2, 0) / r.avaliacoes.length).toFixed(1)
                : null;
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-semibold text-gray-900 text-sm">{r.titulo}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                        {avgAval && (
                          <span className="text-xs flex items-center gap-0.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            ★ {avgAval}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{format(new Date(r.dataHora), "dd MMM yyyy", { locale: ptBR })}
                          <Clock size={11} className="ml-1" />{format(new Date(r.dataHora), "HH:mm")}
                        </span>
                        {r.local && <span className="flex items-center gap-1"><MapPin size={11} />{r.local}</span>}
                        {r.lider && <span>Líder: {r.lider.name}</span>}
                        <span className="flex items-center gap-1"><Users size={11} />{r._count?.presentes ?? 0} presentes</span>
                      </div>
                      {r.anfitrioes?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Home size={10} />Anfitriões: {r.anfitrioes.map((a: any) => a.contact.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setSelected(r); setModal("editar"); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => del(r)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      <Modal open={modal === "novo"} onClose={closeModal} title="Nova Reunião" size="xl">
        <ReuniaoForm onSave={() => { closeModal(); load(true); }} onClose={closeModal} />
      </Modal>
      <Modal open={modal === "editar" && !!selected} onClose={closeModal} title="Editar Reunião" size="xl">
        <ReuniaoForm initial={selected} onSave={() => { closeModal(); load(true); }} onClose={closeModal} />
      </Modal>
    </div>
  );
}
