import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.kanbanStatus.count();
  if (existing > 0) return;

  await prisma.kanbanStatus.createMany({
    data: [
      { name: "Novo Lead", color: "#6366f1", position: 0 },
      { name: "Em Contato", color: "#f59e0b", position: 1 },
      { name: "Aguardando", color: "#3b82f6", position: 2 },
      { name: "Reunião Marcada", color: "#8b5cf6", position: 3 },
      { name: "Convertido", color: "#10b981", position: 4 },
      { name: "Inativo", color: "#6b7280", position: 5 },
    ],
  });

  console.log("✅ Kanban statuses criados com sucesso");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
