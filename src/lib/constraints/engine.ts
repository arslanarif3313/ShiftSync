import { addDays, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import {
  intervalsOverlap,
  isFullyAvailable,
  localDateKey,
  restMinutesBetween,
  shiftDurationMinutes,
} from "@/lib/time";
import type { ConstraintResult, Suggestion, Violation, Warning } from "./types";

const MIN_REST_MINUTES = 10 * 60;
const DAILY_SOFT = 8 * 60;
const DAILY_HARD = 12 * 60;
const WEEKLY_WARN = 35 * 60;

export type EvaluateAssignmentInput = {
  shiftId: string;
  userId: string;
  ignoreAssignmentId?: string;
  seventhDayOverrideReason?: string;
};

export async function evaluateAssignment(
  input: EvaluateAssignmentInput
): Promise<ConstraintResult> {
  const checked = await runChecks(input);
  if (!checked.ok) {
    const suggestions = await suggestAlternatives(input.shiftId, input.userId);
    return { ...checked, suggestions };
  }
  return checked;
}

export async function whatIfAssignment(input: EvaluateAssignmentInput) {
  return evaluateAssignment(input);
}

async function runChecks(
  input: EvaluateAssignmentInput
): Promise<ConstraintResult> {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: input.shiftId },
    include: {
      location: true,
      requiredSkill: true,
      assignments: { where: { status: "ASSIGNED" } },
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    include: {
      skills: true,
      staffLocations: true,
      availability: true,
      availabilityExceptions: true,
    },
  });

  const duration = shiftDurationMinutes(shift.startsAt, shift.endsAt);

  const activeCount = shift.assignments.filter(
    (a) => a.id !== input.ignoreAssignmentId
  ).length;
  if (activeCount >= shift.headcount) {
    violations.push({
      code: "HEADCOUNT_FULL",
      message: `Shift already has ${activeCount}/${shift.headcount} assigned.`,
    });
  }

  if (!user.skills.some((s) => s.skillId === shift.requiredSkillId)) {
    violations.push({
      code: "MISSING_SKILL",
      message: `${user.name} lacks required skill "${shift.requiredSkill.name}".`,
    });
  }

  const cert = user.staffLocations.find((l) => l.locationId === shift.locationId);
  if (!cert?.certified) {
    violations.push({
      code: "NOT_CERTIFIED",
      message: !cert
        ? `${user.name} is not certified at ${shift.location.name}.`
        : `${user.name} is de-certified at ${shift.location.name} (history kept; new assigns blocked).`,
    });
  }

  if (
    !isFullyAvailable({
      shiftStart: shift.startsAt,
      shiftEnd: shift.endsAt,
      userTimeZone: user.timezone,
      windows: user.availability,
      exceptions: user.availabilityExceptions,
    })
  ) {
    violations.push({
      code: "UNAVAILABLE",
      message: `${user.name} is unavailable for this shift (checked in ${user.timezone}; shift displays in ${shift.location.timezone}).`,
    });
  }

  const nearby = await prisma.shiftAssignment.findMany({
    where: {
      userId: input.userId,
      status: "ASSIGNED",
      ...(input.ignoreAssignmentId
        ? { id: { not: input.ignoreAssignmentId } }
        : {}),
      shift: {
        startsAt: {
          gte: new Date(shift.startsAt.getTime() - 36 * 3600_000),
          lte: new Date(shift.endsAt.getTime() + 36 * 3600_000),
        },
      },
    },
    include: { shift: { include: { location: true } } },
  });

  for (const other of nearby) {
    const o = other.shift;
    if (intervalsOverlap(shift.startsAt, shift.endsAt, o.startsAt, o.endsAt)) {
      violations.push({
        code: "DOUBLE_BOOK",
        message: `${user.name} already works at ${o.location.name} during overlapping times.`,
        meta: { conflictingShiftId: o.id },
      });
    } else {
      const rest = restMinutesBetween(
        shift.startsAt,
        shift.endsAt,
        o.startsAt,
        o.endsAt
      );
      if (rest < MIN_REST_MINUTES) {
        violations.push({
          code: "MIN_REST",
          message: `Only ${Math.floor(rest / 60)}h rest before/after another shift at ${o.location.name} (need 10h).`,
          meta: { restMinutes: rest, conflictingShiftId: o.id },
        });
      }
    }
  }

  const locTz = shift.location.timezone;
  const dayKey = localDateKey(shift.startsAt, locTz);
  const weekStartLocal = startOfWeek(toZonedTime(shift.startsAt, locTz), {
    weekStartsOn: 1,
  });
  const weekStartUtc = fromZonedTime(weekStartLocal, locTz);
  const weekEndUtc = addDays(weekStartUtc, 7);

  const weekAssignments = await prisma.shiftAssignment.findMany({
    where: {
      userId: input.userId,
      status: "ASSIGNED",
      ...(input.ignoreAssignmentId
        ? { id: { not: input.ignoreAssignmentId } }
        : {}),
      shift: { startsAt: { gte: weekStartUtc, lt: weekEndUtc } },
    },
    include: { shift: true },
  });

  let weekMinutes = duration;
  let dayMinutes = duration;
  const daysWorked = new Set<string>([dayKey]);

  for (const a of weekAssignments) {
    const mins = shiftDurationMinutes(a.shift.startsAt, a.shift.endsAt);
    weekMinutes += mins;
    const key = localDateKey(a.shift.startsAt, locTz);
    daysWorked.add(key);
    if (key === dayKey) dayMinutes += mins;
  }

  if (dayMinutes > DAILY_HARD) {
    violations.push({
      code: "DAILY_HOURS_HARD",
      message: `Would reach ${(dayMinutes / 60).toFixed(1)} daily hours (hard max 12).`,
    });
  } else if (dayMinutes > DAILY_SOFT) {
    warnings.push({
      code: "DAILY_HOURS_SOFT",
      message: `Would reach ${(dayMinutes / 60).toFixed(1)} daily hours (warn over 8).`,
    });
  }

  if (weekMinutes >= WEEKLY_WARN) {
    const otMinutes = Math.max(0, weekMinutes - 40 * 60);
    warnings.push({
      code: "WEEKLY_HOURS_APPROACHING",
      message: `Projected ${(weekMinutes / 60).toFixed(1)}h this week (warn at 35+).`,
      meta: { weekMinutes, otMinutes },
    });
    if (otMinutes > 0) {
      warnings.push({
        code: "OVERTIME_COST",
        message: `Projected OT pay ~$${((otMinutes / 60) * user.hourlyRate * 1.5).toFixed(2)}.`,
        meta: { otCost: (otMinutes / 60) * user.hourlyRate * 1.5 },
      });
    }
  }

  const streak = longestStreakIncluding([...daysWorked], dayKey);
  if (streak >= 7) {
    if (!input.seventhDayOverrideReason?.trim()) {
      violations.push({
        code: "SEVENTH_DAY_NEEDS_OVERRIDE",
        message: `7th consecutive day requires documented manager override.`,
        meta: { streak },
      });
    } else {
      await prisma.overtimeOverride.upsert({
        where: {
          userId_weekStart: { userId: input.userId, weekStart: weekStartUtc },
        },
        create: {
          userId: input.userId,
          weekStart: weekStartUtc,
          reason: input.seventhDayOverrideReason.trim(),
        },
        update: { reason: input.seventhDayOverrideReason.trim() },
      });
    }
  } else if (streak === 6) {
    warnings.push({
      code: "SIXTH_CONSECUTIVE_DAY",
      message: `6th consecutive day warning for ${user.name}.`,
    });
  }

  if (violations.length) {
    return { ok: false, violations, warnings, suggestions: [] };
  }
  return { ok: true, warnings };
}

async function suggestAlternatives(
  shiftId: string,
  excludeUserId: string
): Promise<Suggestion[]> {
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: { location: true, requiredSkill: true },
  });

  const candidates = await prisma.user.findMany({
    where: {
      role: "STAFF",
      id: { not: excludeUserId },
      skills: { some: { skillId: shift.requiredSkillId } },
      staffLocations: {
        some: { locationId: shift.locationId, certified: true },
      },
    },
    take: 25,
  });

  const suggestions: Suggestion[] = [];
  for (const c of candidates) {
    const result = await runChecks({ shiftId, userId: c.id });
    if (result.ok) {
      suggestions.push({
        userId: c.id,
        name: c.name,
        reason: `Has ${shift.requiredSkill.name}, certified at ${shift.location.name}, available, no conflicts.`,
      });
    }
    if (suggestions.length >= 5) break;
  }
  return suggestions;
}

function longestStreakIncluding(days: string[], includeDay: string) {
  const set = new Set(days);
  let left = includeDay;
  while (set.has(addCalendarDay(left, -1))) {
    left = addCalendarDay(left, -1);
  }
  let count = 0;
  let cursor = left;
  while (set.has(cursor)) {
    count++;
    cursor = addCalendarDay(cursor, 1);
  }
  return count;
}

function addCalendarDay(yyyyMmDd: string, delta: number) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}
