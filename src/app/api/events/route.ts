import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  const locationIds =
    role === "STAFF"
      ? (
          await prisma.staffLocation.findMany({
            where: { userId, certified: true },
            select: { locationId: true },
          })
        ).map((l) => l.locationId)
      : await managerLocationIds(userId, role);

  const channels = [
    `user:${userId}`,
    ...locationIds.map((id) => `location:${id}`),
    ...(role === "ADMIN" ? ["role:ADMIN"] : []),
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastCreatedAt = new Date(Date.now() - 5000);
      let active = true;

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", channels });

      const poll = async () => {
        while (active) {
          const events = await prisma.realtimeEvent.findMany({
            where: {
              channel: { in: channels },
              createdAt: { gt: lastCreatedAt },
            },
            orderBy: { createdAt: "asc" },
            take: 50,
          });

          for (const e of events) {
            lastCreatedAt = e.createdAt;
            send({
              id: e.id,
              type: e.type,
              channel: e.channel,
              payload: e.payload,
            });
          }

          await new Promise((r) => setTimeout(r, 1500));
        }
      };

      poll().catch(() => {
        active = false;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });

      req.signal.addEventListener("abort", () => {
        active = false;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
