"use client";
import { Draggable } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, Clock, MessageSquare } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { type LabelDef, getLabelStyle } from "@/components/ui/LabelManager";

interface Props {
  conversation: any;
  index: number;
  onClick: (c: any) => void;
  onClose?: (id: string) => void;
  labelDefs?: LabelDef[];
}

export function ConversationCard({ conversation, index, onClick, onClose, labelDefs = [] }: Props) {
  const { contact } = conversation;
  const labels: string[] = contact?.labels ?? [];
  const timeSince = contact.lastContactAt
    ? formatDistanceToNow(new Date(contact.lastContactAt), { locale: ptBR, addSuffix: false })
    : null;
  const isOld = contact.lastContactAt && new Date(contact.lastContactAt) < new Date(Date.now() - 7 * 86400000);

  return (
    <Draggable draggableId={conversation.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(conversation)}
          className={`kanban-card mb-2 ${snapshot.isDragging ? "shadow-lg rotate-1 opacity-90" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-semibold text-gray-900 text-sm leading-tight flex-1 min-w-0 truncate">{contact.name}</p>
            <div className="flex items-center gap-1 shrink-0">
              <RoleBadge role={contact.role} />
              {onClose && (
                <button
                  title="Fechar conversa"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onClose(conversation.id); }}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-300 hover:text-gray-600 transition-colors">
                  <Archive size={12} />
                </button>
              )}
            </div>
          </div>

          {contact.lastMessage && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-2">
              <MessageSquare size={11} className="shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-tight">{contact.lastMessage}</span>
            </div>
          )}

          {timeSince && (
            <div className="flex items-center gap-1.5 text-xs mb-2">
              <Clock size={11} className={isOld ? "text-red-400" : "text-gray-400"} />
              <span className={isOld ? "text-red-500 font-medium" : "text-gray-400"}>{timeSince} sem contato</span>
            </div>
          )}

          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 3).map(l => {
                const s = getLabelStyle(l, labelDefs);
                return (
                  <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full leading-none font-medium"
                    style={{ backgroundColor: s.bgColor, color: s.color }}>
                    {l}
                  </span>
                );
              })}
              {labels.length > 3 && (
                <span className="text-[10px] text-gray-400">+{labels.length - 3}</span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
