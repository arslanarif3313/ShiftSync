import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertUnderPendingLimit, dropExpiry } from "@/lib/swaps";
import { notify, audit } from "@/lib/notifications";

const schema = z.object({ shiftId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
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
    include: { shift: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "NOT_YOUR_SHIFT" }, { status: 400 });
  }

  const drop = await prisma.dropRequest.create({
    data: {
      shiftId: parsed.data.shiftId,
      fromUserId: session.user.id,
      status: "OPEN",
      expiresAt: dropExpiry(assignment.shift.startsAt),
    },
  });

  await audit({
    actorId: session.user.id,
    entityType: "DropRequest",
    entityId: drop.id,
    action: "CREATE",
    after: drop,
    shiftId: parsed.data.shiftId,
  });

  await prisma.realtimeEvent.create({
    data: {
      channel: `location:${assignment.shift.locationId}`,
      type: "drop_opened",
      payload: { dropId: drop.id, shiftId: drop.shiftId },
    },
  });

  return NextResponse.json({ drop });
}
