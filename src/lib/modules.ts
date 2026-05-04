/**
 * Catálogo de módulos do sistema. Cada usuário não-admin tem uma lista
 * de keys (User.modules) indicando o que ele pode ver no sidebar.
 * O admin tem acesso a tudo, incluindo "configuracoes".
 */
export const MODULES = [
  { key: "conversas", label: "Conversas",  href: "/conversas" },
  { key: "kanban",    label: "Kanban",     href: "/" },
  { key: "agenda",    label: "Agenda",     href: "/agenda" },
  { key: "demandas",  label: "Demandas",   href: "/demandas" },
  { key: "reunioes",  label: "Reuniões",   href: "/reunioes" },
  { key: "contatos",  label: "Contatos",   href: "/contatos" },
  { key: "campanhas", label: "Campanhas",  href: "/campanhas" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

/** Mapa de prefixos de URL → módulo, pra middleware checar permissão por path. */
export const PATH_TO_MODULE: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/conversas",  module: "conversas" },
  { prefix: "/agenda",     module: "agenda" },
  { prefix: "/demandas",   module: "demandas" },
  { prefix: "/reunioes",   module: "reunioes" },
  { prefix: "/contatos",   module: "contatos" },
  { prefix: "/campanhas",  module: "campanhas" },
];

export function modulesAllowedForUser(user: { isAdmin: boolean; modules: string[] }) {
  if (user.isAdmin) return MODULES.map(m => m.key);
  return MODULES.filter(m => user.modules.includes(m.key)).map(m => m.key);
}
