import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
