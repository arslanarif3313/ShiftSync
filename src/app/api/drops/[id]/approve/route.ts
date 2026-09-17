import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notify, audit } from "@/lib/notifications";

const bodySchema = z.object({ accept: z.boolean() });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const drop = await prisma.dropRequest.findUniqueOrThrow({ where: { id } });
  if (drop.status !== "CLAIMED_PENDING_MANAGER" || !drop.claimantId) {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: drop.shiftId },
  });
  const isManager =
    session.user.role === "ADMIN" ||
    !!(await prisma.managerLocation.findUnique({
      where: {
        userId_locationId: {
          userId: session.user.id,
          locationId: shift.locationId,
        },
      },
    }));
  if (!isManager) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!parsed.data.accept) {
    await prisma.dropRequest.update({
      where: { id },
      data: { status: "OPEN", claimantId: null },
    });
    await notify({
      userId: drop.claimantId,
      type: "DROP_REJECTED",
      title: "Claim rejected",
      body: "Manager rejected your drop claim. Shift is open again.",
      payload: { dropId: id },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftAssignment.updateMany({
      where: {
        shiftId: drop.shiftId,
        userId: drop.fromUserId,
        status: "ASSIGNED",
      },
      data: { status: "CANCELLED" },
    });
    await tx.shiftAssignment.create({
      data: { shiftId: drop.shiftId, userId: drop.claimantId! },
    });
    await tx.dropRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  });

  for (const uid of [drop.fromUserId, drop.claimantId]) {
    await notify({
      userId: uid,
      type: "DROP_APPROVED",
      title: "Drop approved",
      body: "Coverage change is confirmed.",
      payload: { dropId: id },
    });
  }

  await audit({
    actorId: session.user.id,
    entityType: "DropRequest",
    entityId: id,
    action: "APPROVE",
    shiftId: drop.shiftId,
  });

  return NextResponse.json({ ok: true });
}
