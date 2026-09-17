import { formatAtLocation } from "@/lib/time";

export function shiftLabel(
  startsAt: Date,
  endsAt: Date,
  locationTimezone: string
) {
  return `${formatAtLocation(startsAt, locationTimezone, "EEE MMM d h:mm a")} → ${formatAtLocation(
    endsAt,
    locationTimezone,
    "h:mm a zzz"
  )}`;
}
