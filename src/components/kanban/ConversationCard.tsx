"use client";
import { Draggable } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MessageSquare, Phone } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";

interface Props {
  conversation: any;
  index: number;
  onClick: (c: any) => void;
}

export function ConversationCard({ conversation, index, onClick }: Props) {
  const { contact } = conversation;
  const timeSince = contact.lastContactAt
    ? formatDistanceToNow(new Date(contact.lastContactAt), { locale: ptBR, addSuffix: false })
    : null;

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
            <p className="font-semibold text-gray-900 text-sm leading-tight">{contact.name}</p>
            <RoleBadge role={contact.role} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Phone size={11} />
            <span>{contact.phone}</span>
          </div>
          {contact.lastMessage && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-2">
              <MessageSquare size={11} className="shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-tight">{contact.lastMessage}</span>
            </div>
          )}
          {timeSince && (
            <div className="flex items-center gap-1.5 text-xs mt-2">
              <Clock size={11} className={contact.lastContactAt && new Date(contact.lastContactAt) < new Date(Date.now() - 7 * 86400000) ? "text-red-400" : "text-gray-400"} />
              <span className={contact.lastContactAt && new Date(contact.lastContactAt) < new Date(Date.now() - 7 * 86400000) ? "text-red-500 font-medium" : "text-gray-400"}>
                {timeSince} sem contato
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
