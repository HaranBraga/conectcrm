"use client";
import { useState, useEffect, FormEvent } from "react";
import { User as UserIcon, Lock, ShieldCheck, Eye, EyeOff, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function PerfilPage() {
  const [me, setMe] = useState<any | null>(null);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error("Senha nova e confirmação não conferem"); return; }
    if (newPassword.length < 6) { toast.error("Senha nova deve ter ao menos 6 caracteres"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Erro ao trocar senha");
        return;
      }
      toast.success("Senha trocada");
      setCurrent(""); setNewPwd(""); setConfirm("");
    } finally { setSaving(false); }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-sm text-gray-500">Suas informações e troca de senha</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto flex flex-col gap-5">

          {/* Identidade */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Conta</h2>
            {!me ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-lg font-bold">
                  {me.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{me.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <UserIcon size={11} /> @{me.username ?? "(sem usuário)"}
                  </p>
                  {me.isAdmin && (
                    <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
                      <ShieldCheck size={11} /> Administrador
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Trocar senha */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Lock size={14} /> Trocar senha
            </h2>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha atual</label>
                <div className="relative">
                  <input type={show ? "text" : "password"} required value={currentPassword}
                    onChange={e => setCurrent(e.target.value)} autoComplete="current-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Senha nova</label>
                  <input type="password" required value={newPassword} onChange={e => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar nova</label>
                  <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button disabled={saving || !currentPassword || !newPassword || !confirm}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  <Save size={14} /> {saving ? "Salvando..." : "Trocar senha"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
