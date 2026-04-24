import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { prisma } from "@/lib/prisma";
import { RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

async function getColumns() {
  return prisma.kanbanStatus.findMany({
    orderBy: { position: "asc" },
    include: {
      conversations: {
        include: {
          contact: { select: { id: true, name: true, phone: true, role: true, lastContactAt: true, lastMessage: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export default async function KanbanPage() {
  const columns = await getColumns();
  const totalConversations = columns.reduce((s, c) => s + c.conversations.length, 0);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500">{totalConversations} contatos • {columns.length} colunas</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/contatos?novo=1"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Novo Contato
          </Link>
          <form action="/" method="GET">
            <button type="submit" className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm transition-colors">
              <RefreshCw size={15} />
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <p className="text-lg font-medium">Nenhuma coluna criada</p>
            <p className="text-sm">Vá em Configurações para criar as colunas do kanban</p>
            <Link href="/configuracoes" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Ir para Configurações
            </Link>
          </div>
        ) : (
          <KanbanBoard initialColumns={JSON.parse(JSON.stringify(columns))} onRefresh={() => {}} />
        )}
      </div>
    </div>
  );
}
