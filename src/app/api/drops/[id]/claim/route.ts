import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateAssignment } from "@/lib/constraints/engine";
import { expireOpenDrops } from "@/lib/swaps";
import { notify } from "@/lib/notifications";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  await expireOpenDrops();

  const { id } = await ctx.params;
  const drop = await prisma.dropRequest.findUniqueOrThrow({ where: { id } });
  if (drop.status !== "OPEN") {
    return NextResponse.json({ error: "NOT_OPEN" }, { status: 400 });
  }
  if (drop.fromUserId === session.user.id) {
    return NextResponse.json({ error: "CANNOT_CLAIM_OWN" }, { status: 400 });
  }

  const fromAssignment = await prisma.shiftAssignment.findFirstOrThrow({
    where: {
      shiftId: drop.shiftId,
      userId: drop.fromUserId,
      status: "ASSIGNED",
    },
  });

  const check = await evaluateAssignment({
    shiftId: drop.shiftId,
    userId: session.user.id,
    ignoreAssignmentId: fromAssignment.id,
  });
  if (!check.ok) {
    return NextResponse.json({ error: "NOT_ELIGIBLE", ...check }, { status: 422 });
  }

  const updated = await prisma.dropRequest.update({
    where: { id },
    data: {
      status: "CLAIMED_PENDING_MANAGER",
      claimantId: session.user.id,
    },
  });

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: drop.shiftId },
  });
  const managers = await prisma.managerLocation.findMany({
    where: { locationId: shift.locationId },
  });
  for (const m of managers) {
    await notify({
      userId: m.userId,
      type: "DROP_NEEDS_APPROVAL",
      title: "Drop claim needs approval",
      body: "Someone claimed a dropped shift.",
      payload: { dropId: id },
    });
  }

  return NextResponse.json({ drop: updated, warnings: check.warnings });
}
