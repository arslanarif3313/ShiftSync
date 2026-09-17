import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function notify(args: {
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: Prisma.InputJsonValue;
}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: args.userId } });

  const emailSimulatedAt =
    user.notificationChannel === "IN_APP_AND_EMAIL_SIM" ? new Date() : null;

  const row = await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      payload: args.payload,
      emailSimulatedAt,
    },
  });

  await prisma.realtimeEvent.create({
    data: {
      channel: `user:${args.userId}`,
      type: "notification",
      payload: { notificationId: row.id, title: args.title, body: args.body },
    },
  });

  return row;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function audit(args: {
  actorId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  shiftId?: string;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      before: toJson(args.before),
      after: toJson(args.after),
      shiftId: args.shiftId,
    },
  });
}
