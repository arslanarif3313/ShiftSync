import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertManagerOwnsLocation } from "@/lib/permissions";
import { evaluateAssignment } from "@/lib/constraints/engine";
import { assertEditable } from "@/lib/constraints/publish";
import { audit, notify } from "@/lib/notifications";

const bodySchema = z.object({
  userId: z.string(),
  seventhDayOverrideReason: z.string().optional(),
  shiftVersion: z.number().int(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ shiftId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { shiftId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });

  try {
    await assertManagerOwnsLocation(
      session.user.id,
      session.user.role,
      shift.locationId
    );
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const cutoff = await assertEditable(shiftId);
  if (cutoff) {
    return NextResponse.json({ ok: false, violations: [cutoff] }, { status: 409 });
  }

  const result = await evaluateAssignment({
    shiftId,
    userId: parsed.data.userId,
    seventhDayOverrideReason: parsed.data.seventhDayOverrideReason,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const current = await tx.shift.findUniqueOrThrow({ where: { id: shiftId } });
      if (current.version !== parsed.data.shiftVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      const created = await tx.shiftAssignment.create({
        data: { shiftId, userId: parsed.data.userId },
      });

      await tx.shift.update({
        where: { id: shiftId },
        data: { version: { increment: 1 } },
      });

      return created;
    });

    await audit({
      actorId: session.user.id,
      entityType: "ShiftAssignment",
      entityId: assignment.id,
      action: "ASSIGN",
      after: assignment,
      shiftId,
    });

    await notify({
      userId: parsed.data.userId,
      type: "SHIFT_ASSIGNED",
      title: "New shift assigned",
      body: "You have been assigned to a shift. Open ShiftSync to review details.",
      payload: { shiftId },
    });

    await prisma.realtimeEvent.create({
      data: {
        channel: `location:${shift.locationId}`,
        type: "schedule_updated",
        payload: { shiftId },
      },
    });

    return NextResponse.json({ ok: true, assignment, warnings: result.warnings });
  } catch (e) {
    if (e instanceof Error && e.message === "VERSION_CONFLICT") {
      await notify({
        userId: session.user.id,
        type: "ASSIGNMENT_CONFLICT",
        title: "Assignment conflict",
        body: "Another manager updated this shift first. Refresh and try again.",
        payload: { shiftId },
      });
      return NextResponse.json(
        {
          ok: false,
          violations: [
            {
              code: "VERSION_CONFLICT",
              message: "Another manager modified this shift simultaneously.",
            },
          ],
        },
        { status: 409 }
      );
    }
    throw e;
  }
}
