"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Megaphone, Settings, Zap, MessageSquare,
  ClipboardList, CalendarDays, UsersRound, LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

const ICONS: Record<string, any> = {
  conversas: MessageSquare,
  kanban:    LayoutDashboard,
  agenda:    CalendarDays,
  demandas:  ClipboardList,
  reunioes:  UsersRound,
  contatos:  Users,
  campanhas: Megaphone,
};

const NAV = [
  { module: "conversas", href: "/conversas", label: "Conversas" },
  { module: "kanban",    href: "/",          label: "Kanban" },
  { module: "agenda",    href: "/agenda",    label: "Agenda" },
  { module: "demandas",  href: "/demandas",  label: "Demandas" },
  { module: "reunioes",  href: "/reunioes",  label: "Reuniões" },
  { module: "contatos",  href: "/contatos",  label: "Contatos" },
  { module: "campanhas", href: "/campanhas", label: "Campanhas" },
];

type User = { id: string; name: string; username?: string | null; isAdmin: boolean; modules: string[] };

export function Sidebar({ user }: { user: User }) {
  const path = usePathname();
  const router = useRouter();

  const allowed = NAV.filter(item => user.isAdmin || user.modules.includes(item.module));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessão encerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">Conect CRM</span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {allowed.map(({ href, label, module }) => {
          const Icon = ICONS[module];
          const active = href === "/" ? path === "/" : path === href || path?.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}

        {user.isAdmin && (
          <>
            <div className="my-2 border-t border-gray-100" />
            <Link href="/configuracoes"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${path?.startsWith("/configuracoes") ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              <Settings size={18} /> Configurações
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.isAdmin ? "Administrador" : (user.username ? `@${user.username}` : "")}</p>
          </div>
          <button onClick={logout} title="Sair" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
