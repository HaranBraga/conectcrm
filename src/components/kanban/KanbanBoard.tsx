"use client";
import { useState, useCallback } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { ConversationCard } from "./ConversationCard";
import { ConversationModal } from "./ConversationModal";
import { Plus, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  initialColumns: any[];
  onRefresh: () => void;
}

export function KanbanBoard({ initialColumns, onRefresh }: Props) {
  const [columns, setColumns] = useState<any[]>(initialColumns);
  const [selected, setSelected] = useState<any | null>(null);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination || destination.droppableId === source.droppableId) return;

      // Optimistic update
      setColumns((prev) => {
        const next = prev.map((col) => ({ ...col, conversations: [...col.conversations] }));
        const from = next.find((c) => c.id === source.droppableId)!;
        const to = next.find((c) => c.id === destination.droppableId)!;
        const [card] = from.conversations.splice(source.index, 1);
        to.conversations.splice(destination.index, 0, card);
        return next;
      });

      try {
        await fetch("/api/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: draggableId, statusId: destination.droppableId }),
        });
        toast.success("Status atualizado!");
      } catch {
        toast.error("Erro ao mover card");
        onRefresh();
      }
    },
    [onRefresh]
  );

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 p-6 overflow-x-auto h-full items-start">
          {columns.map((col) => (
            <div key={col.id} className="kanban-column">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="font-semibold text-sm text-gray-700">{col.name}</span>
                  <span className="text-xs text-gray-400 font-medium bg-gray-200 px-1.5 py-0.5 rounded-full">
                    {col.conversations.length}
                  </span>
                </div>
                <button className="p-1 hover:bg-gray-200 rounded text-gray-400">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[80px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-brand-50" : ""}`}
                  >
                    {col.conversations.map((conv: any, i: number) => (
                      <ConversationCard
                        key={conv.id}
                        conversation={conv}
                        index={i}
                        onClick={setSelected}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {selected && (
        <ConversationModal
          conversation={selected}
          onClose={() => { setSelected(null); onRefresh(); }}
        />
      )}
    </>
  );
}
