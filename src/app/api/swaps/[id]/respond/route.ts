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

  const swap = await prisma.swapRequest.findUniqueOrThrow({ where: { id } });

  if (swap.status === "PENDING_PEER" && session.user.id === swap.toUserId) {
    if (!parsed.data.accept) {
      const updated = await prisma.swapRequest.update({
        where: { id },
        data: { status: "REJECTED", resolvedAt: new Date() },
      });
      await notify({
        userId: swap.fromUserId,
        type: "SWAP_REJECTED",
        title: "Swap rejected",
        body: "Your swap peer declined.",
        payload: { swapId: id },
      });
      return NextResponse.json({ swap: updated });
    }

    const updated = await prisma.swapRequest.update({
      where: { id },
      data: { status: "PENDING_MANAGER" },
    });

    const shift = await prisma.shift.findUniqueOrThrow({
      where: { id: swap.shiftId },
    });
    const managers = await prisma.managerLocation.findMany({
      where: { locationId: shift.locationId },
    });
    for (const m of managers) {
      await notify({
        userId: m.userId,
        type: "SWAP_NEEDS_APPROVAL",
        title: "Swap needs approval",
        body: "A swap is waiting for your approval.",
        payload: { swapId: id },
      });
    }

    await notify({
      userId: swap.fromUserId,
      type: "SWAP_PEER_ACCEPTED",
      title: "Peer accepted swap",
      body: "Waiting on manager approval. Original assignment still active.",
      payload: { swapId: id },
    });

    return NextResponse.json({ swap: updated });
  }

  if (swap.status === "PENDING_MANAGER") {
    const shift = await prisma.shift.findUniqueOrThrow({
      where: { id: swap.shiftId },
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
      const updated = await prisma.swapRequest.update({
        where: { id },
        data: { status: "REJECTED", resolvedAt: new Date() },
      });
      for (const uid of [swap.fromUserId, swap.toUserId]) {
        await notify({
          userId: uid,
          type: "SWAP_REJECTED",
          title: "Swap rejected by manager",
          body: "The swap was not approved.",
          payload: { swapId: id },
        });
      }
      return NextResponse.json({ swap: updated });
    }

    await prisma.$transaction(async (tx) => {
      await tx.shiftAssignment.updateMany({
        where: {
          shiftId: swap.shiftId,
          userId: swap.fromUserId,
          status: "ASSIGNED",
        },
        data: { status: "CANCELLED" },
      });
      await tx.shiftAssignment.create({
        data: { shiftId: swap.shiftId, userId: swap.toUserId },
      });
      await tx.swapRequest.update({
        where: { id },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
    });

    for (const uid of [swap.fromUserId, swap.toUserId]) {
      await notify({
        userId: uid,
        type: "SWAP_APPROVED",
        title: "Swap approved",
        body: "The schedule has been updated.",
        payload: { swapId: id },
      });
    }

    await audit({
      actorId: session.user.id,
      entityType: "SwapRequest",
      entityId: id,
      action: "APPROVE",
      shiftId: swap.shiftId,
    });

    await prisma.realtimeEvent.create({
      data: {
        channel: `location:${shift.locationId}`,
        type: "swap_resolved",
        payload: { swapId: id, status: "APPROVED" },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
}
