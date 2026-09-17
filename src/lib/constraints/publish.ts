import { prisma } from "@/lib/db";
import type { Violation } from "./types";

export function editCutoffHours() {
  return Number(process.env.SCHEDULE_EDIT_CUTOFF_HOURS ?? 48);
}

export async function assertEditable(shiftId: string): Promise<Violation | null> {
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  const cutoffMs = editCutoffHours() * 3600_000;
  const msUntil = shift.startsAt.getTime() - Date.now();

  if (shift.status === "PUBLISHED" && msUntil < cutoffMs) {
    return {
      code: "CUTOFF_PASSED",
      message: `Cannot edit/unpublish within ${editCutoffHours()}h of shift start (${Math.floor(msUntil / 3600000)}h remaining).`,
    };
  }
  return null;
}
