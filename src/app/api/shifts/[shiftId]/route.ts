import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertManagerOwnsLocation } from "@/lib/permissions";
import { assertEditable } from "@/lib/constraints/publish";
import { isPremiumShift } from "@/lib/time";
import { audit, notify } from "@/lib/notifications";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ shiftId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { shiftId } = await ctx.params;
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: {
      location: true,
      requiredSkill: true,
      assignments: { include: { user: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  return NextResponse.json({ shift });
}

const patchSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  requiredSkillId: z.string().optional(),
  headcount: z.number().int().min(1).optional(),
  shiftVersion: z.number().int(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ shiftId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { shiftId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const before = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: { location: true },
  });

  try {
    await assertManagerOwnsLocation(
      session.user.id,
      session.user.role,
      before.locationId
    );
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const cutoff = await assertEditable(shiftId);
  if (cutoff) {
    return NextResponse.json({ ok: false, violations: [cutoff] }, { status: 409 });
  }

  if (before.version !== parsed.data.shiftVersion) {
    return NextResponse.json(
      {
        ok: false,
        violations: [{ code: "VERSION_CONFLICT", message: "Stale shift version" }],
      },
      { status: 409 }
    );
  }

  const startsAt = parsed.data.startsAt
    ? new Date(parsed.data.startsAt)
    : before.startsAt;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : before.endsAt;

  const updated = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.update({
      where: { id: shiftId },
      data: {
        startsAt,
        endsAt,
        requiredSkillId: parsed.data.requiredSkillId,
        headcount: parsed.data.headcount,
        isPremium: isPremiumShift(startsAt, before.location.timezone),
        version: { increment: 1 },
      },
    });

    const swaps = await tx.swapRequest.findMany({
      where: {
        shiftId,
        status: { in: ["PENDING_PEER", "PENDING_MANAGER"] },
      },
    });
    await tx.swapRequest.updateMany({
      where: { id: { in: swaps.map((s) => s.id) } },
      data: { status: "CANCELLED", resolvedAt: new Date() },
    });

    const drops = await tx.dropRequest.findMany({
      where: {
        shiftId,
        status: { in: ["OPEN", "CLAIMED_PENDING_MANAGER"] },
      },
    });
    await tx.dropRequest.updateMany({
      where: { id: { in: drops.map((d) => d.id) } },
      data: { status: "CANCELLED" },
    });

    return { shift, swaps, drops };
  });

  await audit({
    actorId: session.user.id,
    entityType: "Shift",
    entityId: shiftId,
    action: "UPDATE",
    before,
    after: updated.shift,
    shiftId,
  });

  for (const s of updated.swaps) {
    for (const uid of [s.fromUserId, s.toUserId]) {
      await notify({
        userId: uid,
        type: "SWAP_CANCELLED",
        title: "Swap cancelled",
        body: "A manager edited the shift; your pending swap was cancelled.",
        payload: { shiftId, swapId: s.id },
      });
    }
  }

  return NextResponse.json({ ok: true, shift: updated.shift });
}
