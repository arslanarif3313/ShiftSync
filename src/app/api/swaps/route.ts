import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertUnderPendingLimit } from "@/lib/swaps";
import { evaluateAssignment } from "@/lib/constraints/engine";
import { audit, notify } from "@/lib/notifications";

const createSchema = z.object({
  shiftId: z.string(),
  toUserId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertUnderPendingLimit(session.user.id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PENDING_LIMIT" },
      { status: 400 }
    );
  }

  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      shiftId: parsed.data.shiftId,
      userId: session.user.id,
      status: "ASSIGNED",
    },
  });
  if (!assignment) {
    return NextResponse.json({ error: "NOT_YOUR_SHIFT" }, { status: 400 });
  }

  const check = await evaluateAssignment({
    shiftId: parsed.data.shiftId,
    userId: parsed.data.toUserId,
    ignoreAssignmentId: assignment.id,
  });
  if (!check.ok) {
    return NextResponse.json({ error: "PEER_NOT_ELIGIBLE", ...check }, { status: 422 });
  }

  const swap = await prisma.swapRequest.create({
    data: {
      shiftId: parsed.data.shiftId,
      fromUserId: session.user.id,
      toUserId: parsed.data.toUserId,
      status: "PENDING_PEER",
    },
  });

  await notify({
    userId: parsed.data.toUserId,
    type: "SWAP_REQUEST",
    title: "Swap request",
    body: "A coworker asked to swap a shift with you.",
    payload: { swapId: swap.id },
  });

  await audit({
    actorId: session.user.id,
    entityType: "SwapRequest",
    entityId: swap.id,
    action: "CREATE",
    after: swap,
    shiftId: parsed.data.shiftId,
  });

  return NextResponse.json({ swap });
}
