import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notify, audit } from "@/lib/notifications";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const swap = await prisma.swapRequest.findUniqueOrThrow({ where: { id } });

  const cancellable =
    swap.status === "PENDING_PEER" || swap.status === "PENDING_MANAGER";
  if (!cancellable) {
    return NextResponse.json({ error: "NOT_CANCELLABLE" }, { status: 400 });
  }

  const allowed =
    session.user.id === swap.fromUserId ||
    session.user.role === "ADMIN" ||
    session.user.role === "MANAGER";

  if (!allowed) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const updated = await prisma.swapRequest.update({
    where: { id },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });

  await notify({
    userId: swap.toUserId,
    type: "SWAP_CANCELLED",
    title: "Swap cancelled",
    body: "The other staff member cancelled the swap request.",
    payload: { swapId: id },
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
      type: "SWAP_CANCELLED",
      title: "Swap cancelled",
      body: "A pending swap was cancelled before approval.",
      payload: { swapId: id },
    });
  }

  await audit({
    actorId: session.user.id,
    entityType: "SwapRequest",
    entityId: id,
    action: "CANCEL",
    after: updated,
    shiftId: swap.shiftId,
  });

  return NextResponse.json({ swap: updated });
}
