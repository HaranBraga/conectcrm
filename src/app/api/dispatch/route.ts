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
  const { groupId: rawGroupId, reuniaoId, mode = "all", message, delayMs = 1500 } = await req.json();
  if (!message) return NextResponse.json({ error: "message obrigatório" }, { status: 400 });
  if (!rawGroupId && !reuniaoId) return NextResponse.json({ error: "groupId ou reuniaoId obrigatório" }, { status: 400 });

  let groupId = rawGroupId;

  // Se origem é reunião, monta um ContactGroup virtual com os membros corretos
  if (reuniaoId) {
    const reuniao = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: {
        presentes:  { include: { contact: true } },
        anfitrioes: { include: { contact: true } },
      },
    });
    if (!reuniao) return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });

    const anfIds = new Set(reuniao.anfitrioes.map(a => a.contactId));
    let contactIds: string[] = [];
    if (mode === "anfitrioes") {
      contactIds = reuniao.anfitrioes.map(a => a.contactId);
    } else if (mode === "presentes") {
      contactIds = reuniao.presentes.filter(p => p.contactId && !anfIds.has(p.contactId)).map(p => p.contactId!);
    } else {
      // all
      contactIds = reuniao.presentes.filter(p => p.contactId).map(p => p.contactId!);
    }
    contactIds = Array.from(new Set(contactIds));
    if (contactIds.length === 0) return NextResponse.json({ error: "Nenhum contato encontrado para o modo selecionado" }, { status: 400 });

    const labelMode = mode === "anfitrioes" ? "Anfitriões" : mode === "presentes" ? "Presentes" : "Todos";
    const groupName = `[Reunião] ${reuniao.titulo} — ${labelMode}`;

    const newGroup = await prisma.contactGroup.create({
      data: {
        name: groupName,
        description: `Disparo gerado a partir da reunião de ${new Date(reuniao.dataHora).toLocaleDateString("pt-BR")}`,
        members: { create: contactIds.map(id => ({ contactId: id })) },
      },
    });
    groupId = newGroup.id;
  }

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
