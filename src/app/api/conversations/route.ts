import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  // Move conversation to new status (kanban drag)
  const { conversationId, statusId } = await req.json();
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { statusId },
  });
  return NextResponse.json(conversation);
}
