import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  assignmentId: z.string(),
  action: z.enum(["in", "out"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await prisma.shiftAssignment.findUniqueOrThrow({
    where: { id: parsed.data.assignmentId },
    include: { shift: true },
  });

  if (assignment.userId !== session.user.id && session.user.role === "STAFF") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const updated = await prisma.shiftAssignment.update({
    where: { id: assignment.id },
    data:
      parsed.data.action === "in"
        ? { clockedInAt: new Date() }
        : { clockedOutAt: new Date() },
  });

  await prisma.realtimeEvent.create({
    data: {
      channel: `location:${assignment.shift.locationId}`,
      type: "on_duty_updated",
      payload: { assignmentId: assignment.id, action: parsed.data.action },
    },
  });

  return NextResponse.json({ assignment: updated });
}
