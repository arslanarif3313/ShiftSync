import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertManagerOwnsLocation } from "@/lib/permissions";
import { audit, notify } from "@/lib/notifications";

const bodySchema = z.object({
  scheduleWeekId: z.string(),
  publish: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const week = await prisma.scheduleWeek.findUniqueOrThrow({
    where: { id: parsed.data.scheduleWeekId },
    include: {
      shifts: { include: { assignments: true } },
      location: true,
    },
  });

  try {
    await assertManagerOwnsLocation(
      session.user.id,
      session.user.role,
      week.locationId
    );
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const status = parsed.data.publish ? "PUBLISHED" : "DRAFT";

  await prisma.$transaction([
    prisma.scheduleWeek.update({
      where: { id: week.id },
      data: { publishedAt: parsed.data.publish ? new Date() : null },
    }),
    prisma.shift.updateMany({
      where: { scheduleWeekId: week.id },
      data: { status },
    }),
  ]);

  await audit({
    actorId: session.user.id,
    entityType: "ScheduleWeek",
    entityId: week.id,
    action: parsed.data.publish ? "PUBLISH" : "UNPUBLISH",
    after: { status },
  });

  if (parsed.data.publish) {
    const staffIds = new Set<string>();
    for (const s of week.shifts) {
      for (const a of s.assignments) staffIds.add(a.userId);
    }
    for (const userId of staffIds) {
      await notify({
        userId,
        type: "SCHEDULE_PUBLISHED",
        title: "Schedule published",
        body: `${week.location.name} schedule is now visible.`,
        payload: { scheduleWeekId: week.id },
      });
    }
  }

  await prisma.realtimeEvent.create({
    data: {
      channel: `location:${week.locationId}`,
      type: "schedule_published",
      payload: { scheduleWeekId: week.id, publish: parsed.data.publish },
    },
  });

  return NextResponse.json({ ok: true });
}
