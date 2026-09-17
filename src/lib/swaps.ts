import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";

const MAX_PENDING = 3;

export async function countPendingRequests(userId: string) {
  const [swaps, drops] = await Promise.all([
    prisma.swapRequest.count({
      where: {
        fromUserId: userId,
        status: { in: ["PENDING_PEER", "PENDING_MANAGER"] },
      },
    }),
    prisma.dropRequest.count({
      where: {
        fromUserId: userId,
        status: { in: ["OPEN", "CLAIMED_PENDING_MANAGER"] },
      },
    }),
  ]);
  return swaps + drops;
}

export async function assertUnderPendingLimit(userId: string) {
  const n = await countPendingRequests(userId);
  if (n >= MAX_PENDING) {
    throw new Error(
      `PENDING_LIMIT: You already have ${n} pending swap/drop requests (max ${MAX_PENDING}).`
    );
  }
}

export function dropExpiry(shiftStartsAt: Date) {
  return new Date(shiftStartsAt.getTime() - 24 * 3600_000);
}

export async function expireOpenDrops() {
  const now = new Date();
  const expired = await prisma.dropRequest.findMany({
    where: { status: "OPEN", expiresAt: { lte: now } },
  });
  for (const d of expired) {
    await prisma.dropRequest.update({
      where: { id: d.id },
      data: { status: "EXPIRED" },
    });
    await notify({
      userId: d.fromUserId,
      type: "DROP_EXPIRED",
      title: "Drop request expired",
      body: "Your drop expired 24h before the shift without a claim.",
      payload: { dropId: d.id, shiftId: d.shiftId },
    });
  }
  return expired.length;
}
