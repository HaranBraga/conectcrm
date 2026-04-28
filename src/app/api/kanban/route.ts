import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const statuses = await prisma.kanbanStatus.findMany({
    orderBy: { position: "asc" },
    include: {
      conversations: {
        where: { contact: { source: "message" }, closedAt: null },
        include: {
          contact: { select: { id: true, name: true, phone: true, role: true, lastContactAt: true, lastMessage: true, profilePhotoUrl: true, labels: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return NextResponse.json(statuses);
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  const last = await prisma.kanbanStatus.findFirst({ orderBy: { position: "desc" } });
  const status = await prisma.kanbanStatus.create({
    data: { name, color: color ?? "#6366f1", position: (last?.position ?? -1) + 1 },
  });
  return NextResponse.json(status, { status: 201 });
}
