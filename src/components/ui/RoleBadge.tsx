const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  COORDENADOR_GRUPO: { label: "Coord. Grupo", className: "bg-purple-100 text-purple-700" },
  COORDENADOR:       { label: "Coordenador",  className: "bg-blue-100 text-blue-700" },
  LIDER:             { label: "Líder",         className: "bg-amber-100 text-amber-700" },
  APOIADOR:          { label: "Apoiador",      className: "bg-green-100 text-green-700" },
};

export function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, className: "bg-gray-100 text-gray-600" };
  return <span className={`role-badge ${cfg.className}`}>{cfg.label}</span>;
}

export const ROLE_ORDER = ["COORDENADOR_GRUPO", "COORDENADOR", "LIDER", "APOIADOR"];
export const ROLE_LABELS: Record<string, string> = {
  COORDENADOR_GRUPO: "Coordenador de Grupo",
  COORDENADOR: "Coordenador",
  LIDER: "Líder",
  APOIADOR: "Apoiador",
};
