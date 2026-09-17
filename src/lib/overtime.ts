import { addDays, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { shiftDurationMinutes } from "@/lib/time";

export async function weeklyLaborReport(args: {
  locationId: string;
  around: Date;
}) {
  const location = await prisma.location.findUniqueOrThrow({
    where: { id: args.locationId },
  });
  const weekStartLocal = startOfWeek(toZonedTime(args.around, location.timezone), {
    weekStartsOn: 1,
  });
  const weekStartUtc = fromZonedTime(weekStartLocal, location.timezone);
  const weekEndUtc = addDays(weekStartUtc, 7);

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "ASSIGNED",
      shift: {
        locationId: args.locationId,
        startsAt: { gte: weekStartUtc, lt: weekEndUtc },
      },
    },
    include: { user: true, shift: true },
  });

  type Acc = {
    userId: string;
    name: string;
    minutes: number;
    otMinutes: number;
    otCost: number;
    pushingAssignmentIds: string[];
  };

  const byUser = new Map<string, Acc>();

  for (const a of assignments) {
    const mins = shiftDurationMinutes(a.shift.startsAt, a.shift.endsAt);
    const row =
      byUser.get(a.userId) ??
      ({
        userId: a.userId,
        name: a.user.name,
        minutes: 0,
        otMinutes: 0,
        otCost: 0,
        pushingAssignmentIds: [],
      } satisfies Acc);

    const before = row.minutes;
    row.minutes += mins;
    if (row.minutes > 40 * 60) {
      const overage =
        before >= 40 * 60 ? mins : Math.max(0, row.minutes - 40 * 60);
      row.otMinutes += overage;
      row.otCost += (overage / 60) * a.user.hourlyRate * 1.5;
      row.pushingAssignmentIds.push(a.id);
    }
    byUser.set(a.userId, row);
  }

  const rows = [...byUser.values()].sort((a, b) => b.minutes - a.minutes);
  const totalOtCost = rows.reduce((s, r) => s + r.otCost, 0);

  return { weekStartUtc, weekEndUtc, rows, totalOtCost };
}
