"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, X } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";

export type ContactPickerSelection =
  | { kind: "base"; contact: any }
  | { kind: "manual"; nome: string; telefone: string };

/**
 * Picker que SEMPRE busca na base primeiro. Se não encontrar, oferece
 * cadastrar novo direto. Usado em reuniões, agenda, etc — substitui o
 * toggle "Da base / Número novo" antigo.
 */
export function ContactPicker({ onSelect, placeholder, label }: {
  onSelect: (s: ContactPickerSelection) => void;
  placeholder?: string;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [mNome, setMNome] = useState("");
  const [mTel,  setMTel]  = useState("");
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=8`);
        const d = await r.json();
        setResults(d.contacts ?? []);
        setSearched(true);
      } finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(timer.current);
  }, [q]);

  function pickBase(c: any) {
    onSelect({ kind: "base", contact: c });
    setQ(""); setResults([]); setSearched(false);
    setShowManual(false); setMNome(""); setMTel("");
  }

  function commitManual() {
    const nome = mNome.trim() || mTel.trim();
    const tel  = mTel.trim();
    if (!nome && !tel) return;
    onSelect({ kind: "manual", nome, telefone: tel });
    setShowManual(false); setMNome(""); setMTel("");
    setQ(""); setResults([]); setSearched(false);
  }

  function startManualWithQuery() {
    setMNome(q);
    setShowManual(true);
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs font-semibold text-gray-500">{label}</p>}

      {/* Sempre: busca na base */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={placeholder ?? "Buscar na base..."}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {/* Resultados */}
      {q && (
        <div className="flex flex-col gap-1">
          {searching && <p className="text-xs text-gray-400 px-2">Buscando...</p>}
          {!searching && results.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-white max-h-44 overflow-y-auto divide-y divide-gray-50">
              {results.map(c => (
                <button key={c.id} type="button" onClick={() => pickBase(c)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  {c.role && <RoleBadge role={c.role} />}
                </button>
              ))}
            </div>
          )}
          {!searching && searched && results.length === 0 && !showManual && (
            <div className="text-xs text-gray-500 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between gap-2">
              <span>Não encontrado na base.</span>
              <button onClick={startManualWithQuery} className="text-brand-600 hover:underline font-medium whitespace-nowrap">
                Cadastrar "{q.length > 20 ? q.slice(0, 20) + "..." : q}" →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cadastrar novo (sempre disponível) */}
      {!showManual ? (
        <button type="button" onClick={() => setShowManual(true)}
          className="text-xs text-gray-500 hover:text-brand-600 self-start flex items-center gap-1">
          <Plus size={11} /> Cadastrar novo (sem estar na base)
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-[10px] uppercase font-semibold text-gray-500">Novo cadastro</p>
          <div className="flex gap-2">
            <input value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Nome"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input value={mTel} onChange={e => setMTel(e.target.value)} placeholder="Telefone"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={commitManual}
              className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium shrink-0">
              <Plus size={14} />
            </button>
            <button type="button" onClick={() => { setShowManual(false); setMNome(""); setMTel(""); }}
              className="text-gray-400 hover:text-red-500 px-2 shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
