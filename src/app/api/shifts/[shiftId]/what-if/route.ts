import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { evaluateAssignment } from "@/lib/constraints/engine";

const bodySchema = z.object({
  userId: z.string(),
  seventhDayOverrideReason: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ shiftId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { shiftId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await evaluateAssignment({
    shiftId,
    userId: parsed.data.userId,
    seventhDayOverrideReason: parsed.data.seventhDayOverrideReason,
  });

  return NextResponse.json(result);
}
