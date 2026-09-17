import { prisma } from "@/lib/db";
import { shiftDurationMinutes } from "@/lib/time";

export async function fairnessReport(args: {
  locationId: string;
  from: Date;
  to: Date;
}) {
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      staffLocations: {
        some: { locationId: args.locationId, certified: true },
      },
    },
  });

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "ASSIGNED",
      userId: { in: staff.map((s) => s.id) },
      shift: {
        locationId: args.locationId,
        startsAt: { gte: args.from, lt: args.to },
        status: "PUBLISHED",
      },
    },
    include: { shift: true, user: true },
  });

  const rows = staff.map((s) => {
    const mine = assignments.filter((a) => a.userId === s.id);
    const minutes = mine.reduce(
      (sum, a) => sum + shiftDurationMinutes(a.shift.startsAt, a.shift.endsAt),
      0
    );
    const premiumCount = mine.filter((a) => a.shift.isPremium).length;
    const desired = s.desiredHoursPerWeek;
    const weeks = Math.max(
      1,
      (args.to.getTime() - args.from.getTime()) / (7 * 86400000)
    );
    const desiredMinutes = desired * 60 * weeks;
    const deltaMinutes = minutes - desiredMinutes;

    return {
      userId: s.id,
      name: s.name,
      hours: minutes / 60,
      desiredHours: desired * weeks,
      deltaHours: deltaMinutes / 60,
      premiumCount,
      underScheduled: deltaMinutes < -2 * 60,
      overScheduled: deltaMinutes > 2 * 60,
    };
  });

  const premiumTotal = rows.reduce((s, r) => s + r.premiumCount, 0);
  const fairShare = rows.length ? premiumTotal / rows.length : 0;
  const variance =
    rows.length === 0
      ? 0
      : rows.reduce((s, r) => s + (r.premiumCount - fairShare) ** 2, 0) / rows.length;
  const fairnessScore = Math.max(0, Math.round(100 - variance * 25));

  return { rows, premiumTotal, fairShare, fairnessScore };
}
