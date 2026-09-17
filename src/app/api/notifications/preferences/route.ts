import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  notificationChannel: z.enum(["IN_APP", "IN_APP_AND_EMAIL_SIM"]),
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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationChannel: parsed.data.notificationChannel },
  });

  return NextResponse.json({ ok: true });
}
