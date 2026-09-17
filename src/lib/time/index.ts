import {
  addDays,
  addMinutes,
  differenceInMinutes,
  getDay,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Format a UTC instant for display in a location timezone */
export function formatAtLocation(
  utcDate: Date,
  timeZone: string,
  pattern = "EEE MMM d, yyyy h:mm a zzz"
) {
  return formatInTimeZone(utcDate, timeZone, pattern);
}

/**
 * Build a UTC Date from a calendar day + local wall clock in `timeZone`.
 */
export function wallTimeToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const localIso = `${year}-${pad(monthIndex + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
  return fromZonedTime(localIso, timeZone);
}

/** Overnight-safe duration in minutes */
export function shiftDurationMinutes(startsAt: Date, endsAt: Date) {
  const mins = differenceInMinutes(endsAt, startsAt);
  if (mins <= 0) {
    throw new Error(
      "INVALID_SHIFT_RANGE: endsAt must be after startsAt (use next-day end for overnight)"
    );
  }
  return mins;
}

/** Touching endpoints = NO overlap (back-to-back OK before rest rule). */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && bStart < aEnd;
}

/** Minutes between end of earlier and start of later (0 if overlapping). */
export function restMinutesBetween(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  if (intervalsOverlap(aStart, aEnd, bStart, bEnd)) return 0;
  if (aEnd <= bStart) return differenceInMinutes(bStart, aEnd);
  return differenceInMinutes(aStart, bEnd);
}

export type AvailabilityWindowLike = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
};

export function windowToUtcInterval(
  window: AvailabilityWindowLike,
  userTimeZone: string,
  around: Date
): { start: Date; end: Date } {
  const local = toZonedTime(around, userTimeZone);
  const weekStart = startOfWeek(local, { weekStartsOn: 0 });
  const dayDate = addDays(weekStart, window.dayOfWeek);

  const y = dayDate.getFullYear();
  const m = dayDate.getMonth();
  const d = dayDate.getDate();

  const startH = Math.floor(window.startMin / 60);
  const startM = window.startMin % 60;
  let endH = Math.floor(window.endMin / 60);
  let endM = window.endMin % 60;

  let endDayOffset = 0;
  if (window.endMin >= 24 * 60) {
    endDayOffset = 1;
    endH = 0;
    endM = 0;
  }

  const start = wallTimeToUtc(y, m, d, startH, startM, userTimeZone);
  const endBase = wallTimeToUtc(y, m, d + endDayOffset, endH, endM, userTimeZone);
  const end = endBase <= start ? addMinutes(endBase, 24 * 60) : endBase;

  return { start, end };
}

export function isFullyAvailable(args: {
  shiftStart: Date;
  shiftEnd: Date;
  userTimeZone: string;
  windows: AvailabilityWindowLike[];
  exceptions: { startsAt: Date; endsAt: Date; isAvailable: boolean }[];
}): boolean {
  const { shiftStart, shiftEnd, userTimeZone, windows, exceptions } = args;

  for (const ex of exceptions) {
    if (
      !ex.isAvailable &&
      intervalsOverlap(shiftStart, shiftEnd, ex.startsAt, ex.endsAt)
    ) {
      return false;
    }
  }

  for (const ex of exceptions) {
    if (ex.isAvailable && ex.startsAt <= shiftStart && ex.endsAt >= shiftEnd) {
      return true;
    }
  }

  const slices = splitByLocalDays(shiftStart, shiftEnd, userTimeZone);
  for (const slice of slices) {
    const local = toZonedTime(slice.start, userTimeZone);
    const dow = getDay(local);
    const dayWindows = windows.filter((w) => w.dayOfWeek === dow);
    if (dayWindows.length === 0) return false;

    const covered = dayWindows.some((w) => {
      const { start, end } = windowToUtcInterval(w, userTimeZone, slice.start);
      return start <= slice.start && end >= slice.end;
    });
    if (!covered) return false;
  }
  return true;
}

export function splitByLocalDays(start: Date, end: Date, timeZone: string) {
  const slices: { start: Date; end: Date }[] = [];
  let cursor = start;

  while (cursor < end) {
    const local = toZonedTime(cursor, timeZone);
    const nextLocalMidnight = wallTimeToUtc(
      local.getFullYear(),
      local.getMonth(),
      local.getDate() + 1,
      0,
      0,
      timeZone
    );
    const sliceEnd = nextLocalMidnight < end ? nextLocalMidnight : end;
    slices.push({ start: cursor, end: sliceEnd });
    cursor = sliceEnd;
  }
  return slices;
}

export function localDateKey(utc: Date, timeZone: string) {
  return formatInTimeZone(utc, timeZone, "yyyy-MM-dd");
}

export function isPremiumShift(startsAt: Date, locationTimeZone: string) {
  const local = toZonedTime(startsAt, locationTimeZone);
  const day = local.getDay();
  const hour = local.getHours();
  return (day === 5 || day === 6) && hour >= 17;
}
