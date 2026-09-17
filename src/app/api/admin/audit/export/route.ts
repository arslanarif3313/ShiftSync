import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const locationId = searchParams.get("locationId");

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      ...(locationId ? { shift: { locationId } } : {}),
    },
    include: { actor: true, shift: { include: { location: true } } },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "createdAt",
    "actor",
    "action",
    "entityType",
    "entityId",
    "location",
    "before",
    "after",
  ];

  const escape = (v: unknown) => {
    const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
    return `"${s.replaceAll('"', '""')}"`;
  };

  const lines = [
    header.join(","),
    ...logs.map((l) =>
      [
        l.createdAt.toISOString(),
        l.actor?.email ?? "",
        l.action,
        l.entityType,
        l.entityId,
        l.shift?.location.name ?? "",
        escape(l.before),
        escape(l.after),
      ].join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shiftsync-audit.csv"`,
    },
  });
}
