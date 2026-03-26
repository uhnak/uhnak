import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tags, note } = body as { tags?: string[]; note?: string };

  const listing = await prisma.listing.update({
    where: { id: params.id },
    data: {
      ...(tags !== undefined && { tags: tags.length ? JSON.stringify(tags) : null }),
      ...(note !== undefined && { note: note || null }),
    },
  });

  return NextResponse.json(listing);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.listing.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
