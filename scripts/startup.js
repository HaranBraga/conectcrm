const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { id: "role-coordenador-grupo", key: "COORDENADOR_GRUPO", label: "Coordenador de Grupo", color: "#7c3aed", bgColor: "#ede9fe", level: 0 },
  { id: "role-coordenador",       key: "COORDENADOR",       label: "Coordenador",          color: "#1d4ed8", bgColor: "#dbeafe", level: 1 },
  { id: "role-lider",             key: "LIDER",             label: "Líder",                color: "#b45309", bgColor: "#fef3c7", level: 2 },
  { id: "role-apoiador",          key: "APOIADOR",          label: "Apoiador",             color: "#15803d", bgColor: "#dcfce7", level: 3 },
];

async function seedRoles() {
  const count = await prisma.personRole.count();
  if (count === 0) {
    for (const role of DEFAULT_ROLES) {
      await prisma.personRole.upsert({
        where: { id: role.id },
        update: {},
        create: role,
      });
    }
    console.log("✅ Cargos: 4 cargos padrão criados");
  } else {
    console.log(`✅ Cargos: ${count} cargos já existem`);
  }
}

async function seedKanban() {
  const count = await prisma.kanbanStatus.count();
  if (count === 0) {
    await prisma.kanbanStatus.createMany({
      data: [
        { name: "Novo Lead",       color: "#6366f1", position: 0 },
        { name: "Em Contato",      color: "#f59e0b", position: 1 },
        { name: "Aguardando",      color: "#3b82f6", position: 2 },
        { name: "Reunião Marcada", color: "#8b5cf6", position: 3 },
        { name: "Convertido",      color: "#10b981", position: 4 },
        { name: "Inativo",         color: "#6b7280", position: 5 },
      ],
    });
    console.log("✅ Kanban: 6 colunas padrão criadas");
  } else {
    console.log(`✅ Kanban: ${count} colunas já existem`);
  }
}

const DEFAULT_LABELS = [
  { name: "Interessado", color: "#10b981", bgColor: "#d1fae5" },
  { name: "Sem retorno", color: "#f59e0b", bgColor: "#fef3c7" },
  { name: "Frio",        color: "#3b82f6", bgColor: "#dbeafe" },
  { name: "VIP",         color: "#8b5cf6", bgColor: "#ede9fe" },
  { name: "Urgente",     color: "#ef4444", bgColor: "#fee2e2" },
  { name: "Reunião",     color: "#ec4899", bgColor: "#fce7f3" },
];

async function seedLabels() {
  const count = await prisma.label.count();
  if (count === 0) {
    for (const label of DEFAULT_LABELS) {
      await prisma.label.upsert({ where: { name: label.name }, update: {}, create: label });
    }
    console.log("✅ Etiquetas: 6 etiquetas padrão criadas");
  } else {
    console.log(`✅ Etiquetas: ${count} etiquetas já existem`);
  }
}

async function seedDemandaConfig() {
  const defaults = {
    demanda_statuses: JSON.stringify([
      { key: "ANALISAR",     label: "Analisar",     color: "#6366f1", isClosed: false, position: 0 },
      { key: "EM_ANDAMENTO", label: "Em Andamento", color: "#f59e0b", isClosed: false, position: 1 },
      { key: "PENDENTE",     label: "Pendente",     color: "#f97316", isClosed: false, position: 2 },
      { key: "ATENDIDA",     label: "Atendida",     color: "#10b981", isClosed: true,  position: 3 },
      { key: "NAO_ATENDIDA", label: "Não Atendida", color: "#ef4444", isClosed: true,  position: 4 },
    ]),
    demanda_prioridades: JSON.stringify([
      { key: "URGENTE",    label: "Urgente",    color: "#dc2626", bgColor: "#fee2e2", position: 0 },
      { key: "IMPORTANTE", label: "Importante", color: "#ea580c", bgColor: "#ffedd5", position: 1 },
      { key: "MEDIA",      label: "Média",      color: "#2563eb", bgColor: "#dbeafe", position: 2 },
      { key: "NORMAL",     label: "Normal",     color: "#6b7280", bgColor: "#f3f4f6", position: 3 },
    ]),
    demanda_segmentos: JSON.stringify(["Saúde", "Esporte", "Ação"]),
  };
  for (const [key, value] of Object.entries(defaults)) {
    const ex = await prisma.appConfig.findUnique({ where: { key } });
    if (!ex) await prisma.appConfig.create({ data: { key, value } });
  }
  console.log("✅ Demanda config: status, prioridades e segmentos verificados");
}

async function seedCalendarios() {
  const count = await prisma.agendaCalendario.count();
  if (count === 0) {
    await prisma.agendaCalendario.createMany({
      data: [
        { nome: "Agenda Política", cor: "#6366f1", isPadrao: true },
        { nome: "Pessoal",         cor: "#10b981", isPadrao: false },
      ],
    });
    console.log("✅ Calendários: 2 calendários padrão criados");
  } else {
    console.log(`✅ Calendários: ${count} calendários já existem`);
  }
}

async function seedAdmin() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`✅ Usuários: ${count} já cadastrados`);
    return;
  }
  const email = (process.env.ADMIN_EMAIL || "admin@admin.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      password: hashed,
      isAdmin: true,
      modules: [],
      active: true,
    },
  });
  console.log(`✅ Admin inicial criado — email: ${email}, senha: ${password}`);
  console.log("   ⚠ Mude a senha imediatamente em Configurações > Usuários");
}

async function main() {
  await seedRoles();
  await seedKanban();
  await seedLabels();
  await seedDemandaConfig();
  await seedCalendarios();
  await seedAdmin();
}

main()
  .catch((e) => { console.error("Startup seed error:", e); })
  .finally(() => prisma.$disconnect());
