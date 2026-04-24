import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/evolution";

export async function GET() {
  const dispatches = await prisma.dispatch.findMany({
    include: { group: { select: { name: true } }, _count: { select: { results: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(dispatches);
}

export async function POST(req: NextRequest) {
  const { groupId, message, delayMs = 1500 } = await req.json();
  if (!groupId || !message) return NextResponse.json({ error: "groupId e message obrigatórios" }, { status: 400 });

  const group = await prisma.contactGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { contact: true } } },
  });
  if (!group) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });

  const dispatch = await prisma.dispatch.create({
    data: { groupId, message, status: "SENDING" },
  });

  // Fire-and-forget async sending
  (async () => {
    const results = [];
    for (const member of group.members) {
      await new Promise((r) => setTimeout(r, delayMs));
      let success = false;
      let error: string | undefined;
      try {
        await sendText(member.contact.phone, message);
        success = true;
        await prisma.contact.update({
          where: { id: member.contactId },
          data: { lastContactAt: new Date(), lastMessage: message },
        });
      } catch (e: any) {
        error = e?.message ?? "Erro desconhecido";
      }
      results.push({ contactId: member.contactId, contactName: member.contact.name, phone: member.contact.phone, success, error });
    }

    await prisma.dispatchResult.createMany({ data: results.map((r) => ({ ...r, dispatchId: dispatch.id })) });
    await prisma.dispatch.update({
      where: { id: dispatch.id },
      data: { status: "DONE", sentAt: new Date() },
    });
  })();

  return NextResponse.json({ dispatchId: dispatch.id, total: group.members.length }, { status: 202 });
}
