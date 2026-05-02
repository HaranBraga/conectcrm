"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Users } from "lucide-react";

const tabs = [
  { href: "/campanhas",          label: "Campanhas", icon: Megaphone },
  { href: "/campanhas/reunioes", label: "Reuniões",  icon: Users     },
];

export function CampanhasTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1 px-6 bg-white">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = path === t.href || (t.href !== "/campanhas" && path?.startsWith(t.href));
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
