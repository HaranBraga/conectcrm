import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const items = await prisma.campaignContact.findMany({
    where: { contactId: params.id },
    include: {
      campaign:    { select: { id: true, name: true, status: true } },
      responseTag: true,
    },
    orderBy: { addedAt: "desc" },
  });
  return NextResponse.json(items);
}
