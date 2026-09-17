import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertManagerOwnsLocation } from "@/lib/permissions";
import { isPremiumShift } from "@/lib/time";
import { audit } from "@/lib/notifications";

const bodySchema = z.object({
  locationId: z.string(),
  requiredSkillId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  headcount: z.number().int().min(1).default(1),
  scheduleWeekId: z.string().optional(),
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

  const data = parsed.data;
  try {
    await assertManagerOwnsLocation(
      session.user.id,
      session.user.role,
      data.locationId
    );
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "endsAt must be after startsAt (overnight = next calendar day end)" },
      { status: 400 }
    );
  }

  const location = await prisma.location.findUniqueOrThrow({
    where: { id: data.locationId },
  });

  const shift = await prisma.shift.create({
    data: {
      locationId: data.locationId,
      requiredSkillId: data.requiredSkillId,
      startsAt,
      endsAt,
      headcount: data.headcount,
      scheduleWeekId: data.scheduleWeekId,
      status: "DRAFT",
      isPremium: isPremiumShift(startsAt, location.timezone),
    },
  });

  await audit({
    actorId: session.user.id,
    entityType: "Shift",
    entityId: shift.id,
    action: "CREATE",
    after: shift,
    shiftId: shift.id,
  });

  return NextResponse.json({ shift });
}
