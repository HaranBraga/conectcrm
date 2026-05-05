"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Users, Cake } from "lucide-react";

const tabs = [
  { href: "/campanhas",              label: "Campanhas",     icon: Megaphone },
  { href: "/campanhas/reunioes",     label: "Reuniões",      icon: Users     },
  { href: "/campanhas/aniversarios", label: "Aniversários",  icon: Cake      },
];

export function CampanhasTabs() {
  const path = usePathname() ?? "";

  // Resolve qual aba está ativa. Cada aba mais específica (reunioes/aniversarios)
  // ganha prioridade. Se não bate com nenhuma específica, mas o path começa
  // com /campanhas, ativa a aba "Campanhas" (cobre /campanhas e /campanhas/[id]).
  const specific = tabs.find(t => t.href !== "/campanhas" && (path === t.href || path.startsWith(t.href + "/")));
  const activeHref = specific
    ? specific.href
    : (path === "/campanhas" || path.startsWith("/campanhas/")) ? "/campanhas" : null;

  return (
    <div className="flex gap-1 px-6 bg-white">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = activeHref === t.href;
        return (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
