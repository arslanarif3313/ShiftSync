import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

export async function assertManagerOwnsLocation(
  userId: string,
  role: Role,
  locationId: string
) {
  if (role === "ADMIN") return true;

  if (role !== "MANAGER") {
    throw new Error("FORBIDDEN");
  }

  const link = await prisma.managerLocation.findUnique({
    where: { userId_locationId: { userId, locationId } },
  });

  if (!link) throw new Error("FORBIDDEN_LOCATION");
  return true;
}

export async function managerLocationIds(userId: string, role: Role) {
  if (role === "ADMIN") {
    const all = await prisma.location.findMany({ select: { id: true } });
    return all.map((l) => l.id);
  }
  const links = await prisma.managerLocation.findMany({
    where: { userId },
    select: { locationId: true },
  });
  return links.map((l) => l.locationId);
}
