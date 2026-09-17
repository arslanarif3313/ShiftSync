import {
  PrismaClient,
  Role,
  ShiftStatus,
  NotificationChannel,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  addDays,
  addHours,
  nextMonday,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

async function main() {
  // Wipe in FK-safe order for re-seedable demos
  await prisma.realtimeEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.overtimeOverride.deleteMany();
  await prisma.dropRequest.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.scheduleWeek.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityWindow.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.staffLocation.deleteMany();
  await prisma.managerLocation.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Skills ---
  const [bartender, lineCook, server, host] = await Promise.all(
    ["bartender", "line cook", "server", "host"].map((name) =>
      prisma.skill.create({ data: { name } }),
    ),
  );

  // --- Locations (4 locations, 2 timezones) ---
  const santaMonica = await prisma.location.create({
    data: {
      name: "Coastal Eats — Santa Monica",
      timezone: "America/Los_Angeles",
    },
  });
  const seattle = await prisma.location.create({
    data: { name: "Coastal Eats — Seattle", timezone: "America/Los_Angeles" },
  });
  const miami = await prisma.location.create({
    data: { name: "Coastal Eats — Miami", timezone: "America/New_York" },
  });
  const brooklyn = await prisma.location.create({
    data: { name: "Coastal Eats — Brooklyn", timezone: "America/New_York" },
  });

  // --- Admin ---
  const admin = await prisma.user.create({
    data: {
      email: "admin@coastaleats.test",
      name: "Alex Admin",
      passwordHash,
      role: Role.ADMIN,
      timezone: "America/New_York",
      notificationChannel: NotificationChannel.IN_APP_AND_EMAIL_SIM,
    },
  });

  // --- Managers ---
  const managerWest = await prisma.user.create({
    data: {
      email: "manager.west@coastaleats.test",
      name: "Morgan West",
      passwordHash,
      role: Role.MANAGER,
      timezone: "America/Los_Angeles",
      managerLocations: {
        create: [{ locationId: santaMonica.id }, { locationId: seattle.id }],
      },
    },
  });

  const managerEast = await prisma.user.create({
    data: {
      email: "manager.east@coastaleats.test",
      name: "Casey East",
      passwordHash,
      role: Role.MANAGER,
      timezone: "America/New_York",
      managerLocations: {
        create: [{ locationId: miami.id }, { locationId: brooklyn.id }],
      },
    },
  });

  // --- Staff ---
  // Sarah: multi-location PT+ET — Timezone Tangle scenario
  const sarah = await prisma.user.create({
    data: {
      email: "staff.sarah@coastaleats.test",
      name: "Sarah Chen",
      passwordHash,
      role: Role.STAFF,
      timezone: "America/Los_Angeles",
      desiredHoursPerWeek: 32,
      hourlyRate: 22,
      skills: { create: [{ skillId: bartender.id }, { skillId: server.id }] },
      staffLocations: {
        create: [
          { locationId: santaMonica.id, certified: true },
          { locationId: miami.id, certified: true },
        ],
      },
      // "9am–5pm" in HER timezone (Pacific)
      availability: {
        create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 9 * 60,
          endMin: 17 * 60,
        })),
      },
    },
  });

  // John: always available bartender — good swap alternative
  const john = await prisma.user.create({
    data: {
      email: "staff.john@coastaleats.test",
      name: "John Rivera",
      passwordHash,
      role: Role.STAFF,
      timezone: "America/Los_Angeles",
      desiredHoursPerWeek: 40,
      hourlyRate: 20,
      skills: { create: [{ skillId: bartender.id }] },
      staffLocations: {
        create: [{ locationId: santaMonica.id }, { locationId: seattle.id }],
      },
      availability: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 8 * 60,
          endMin: 23 * 60,
        })),
      },
    },
  });

  // Maria: server + host, East coast
  const maria = await prisma.user.create({
    data: {
      email: "staff.maria@coastaleats.test",
      name: "Maria Lopez",
      passwordHash,
      role: Role.STAFF,
      timezone: "America/New_York",
      desiredHoursPerWeek: 28,
      hourlyRate: 18,
      skills: { create: [{ skillId: server.id }, { skillId: host.id }] },
      staffLocations: {
        create: [{ locationId: miami.id }, { locationId: brooklyn.id }],
      },
      availability: {
        create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 10 * 60,
          endMin: 22 * 60,
        })),
      },
    },
  });

  // Dev: line cook who will be near overtime (Overtime Trap)
  const devon = await prisma.user.create({
    data: {
      email: "staff.devon@coastaleats.test",
      name: "Devon Park",
      passwordHash,
      role: Role.STAFF,
      timezone: "America/Los_Angeles",
      desiredHoursPerWeek: 40,
      hourlyRate: 19,
      skills: { create: [{ skillId: lineCook.id }] },
      staffLocations: { create: [{ locationId: seattle.id }] },
      availability: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 6 * 60,
          endMin: 23 * 60,
        })),
      },
    },
  });

  // Riley: under-scheduled for fairness demo
  const riley = await prisma.user.create({
    data: {
      email: "staff.riley@coastaleats.test",
      name: "Riley Quinn",
      passwordHash,
      role: Role.STAFF,
      timezone: "America/Los_Angeles",
      desiredHoursPerWeek: 35,
      hourlyRate: 21,
      skills: { create: [{ skillId: bartender.id }, { skillId: server.id }] },
      staffLocations: { create: [{ locationId: santaMonica.id }] },
      availability: {
        create: [4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMin: 16 * 60,
          endMin: 24 * 60 - 1,
        })),
      },
    },
  });

  // Helper: local wall time → UTC for a location
  function localToUtc(date: Date, hour: number, minute: number, tz: string) {
    const zoned = setMinutes(setHours(toZonedTime(date, tz), hour), minute);
    return fromZonedTime(zoned, tz);
  }

  function isPremium(startsAt: Date, tz: string) {
    const local = toZonedTime(startsAt, tz);
    const day = local.getDay(); // 5=Fri, 6=Sat
    const hour = local.getHours();
    return (day === 5 || day === 6) && hour >= 17;
  }

  // Anchor week: next Monday
  const weekStartLocal = startOfDay(nextMonday(new Date()));
  const weekStartUtcSM = fromZonedTime(weekStartLocal, santaMonica.timezone);

  const weekSM = await prisma.scheduleWeek.create({
    data: { locationId: santaMonica.id, weekStart: weekStartUtcSM },
  });
  const weekSEA = await prisma.scheduleWeek.create({
    data: {
      locationId: seattle.id,
      weekStart: fromZonedTime(weekStartLocal, seattle.timezone),
    },
  });

  // --- Premium Sat night for John (Fairness Complaint bait) ---
  const sat = addDays(weekStartLocal, 5); // Monday+5 = Saturday
  const satNightStart = localToUtc(sat, 18, 0, santaMonica.timezone);
  const satNightEnd = localToUtc(sat, 23, 0, santaMonica.timezone);

  const premiumShift = await prisma.shift.create({
    data: {
      locationId: santaMonica.id,
      scheduleWeekId: weekSM.id,
      requiredSkillId: bartender.id,
      startsAt: satNightStart,
      endsAt: satNightEnd,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: isPremium(satNightStart, santaMonica.timezone),
      assignments: { create: [{ userId: john.id }] },
    },
  });

  // Riley has NO premium shifts → fairness complaint for Sarah/Riley narrative

  // --- Overnight shift (11pm–3am) ---
  const fri = addDays(weekStartLocal, 4);
  const overnightStart = localToUtc(fri, 23, 0, santaMonica.timezone);
  const overnightEnd = localToUtc(addDays(fri, 1), 3, 0, santaMonica.timezone);

  await prisma.shift.create({
    data: {
      locationId: santaMonica.id,
      scheduleWeekId: weekSM.id,
      requiredSkillId: server.id,
      startsAt: overnightStart,
      endsAt: overnightEnd,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: true,
      assignments: { create: [{ userId: sarah.id }] },
    },
  });

  // --- Devon near overtime: ~36h already scheduled Mon–Thu 9h each ---
  for (let d = 0; d < 4; d++) {
    const day = addDays(weekStartLocal, d);
    const start = localToUtc(day, 8, 0, seattle.timezone);
    const end = localToUtc(day, 17, 0, seattle.timezone);
    await prisma.shift.create({
      data: {
        locationId: seattle.id,
        scheduleWeekId: weekSEA.id,
        requiredSkillId: lineCook.id,
        startsAt: start,
        endsAt: end,
        headcount: 1,
        status: ShiftStatus.PUBLISHED,
        isPremium: false,
        assignments: { create: [{ userId: devon.id }] },
      },
    });
  }
  // Manager assigning another 10h Fri → would push Devon to 46h (warning path)
  // Leave Fri empty so the evaluator can trigger the Overtime Trap live.

  // --- Sunday night chaos: unassigned 7pm bartender shift ---
  const sun = addDays(weekStartLocal, 6);
  const sunShiftStart = localToUtc(sun, 19, 0, santaMonica.timezone);
  const sunShiftEnd = localToUtc(sun, 23, 0, santaMonica.timezone);

  await prisma.shift.create({
    data: {
      locationId: santaMonica.id,
      scheduleWeekId: weekSM.id,
      requiredSkillId: bartender.id,
      startsAt: sunShiftStart,
      endsAt: sunShiftEnd,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: false,
      // no assignment — coverage scenario
    },
  });

  // Sarah blackout exception Sunday evening (call-out simulation material)
  await prisma.availabilityException.create({
    data: {
      userId: sarah.id,
      startsAt: sunShiftStart,
      endsAt: sunShiftEnd,
      isAvailable: false,
      reason: "Family emergency — seed blackout",
    },
  });

  // Welcome notifications
  for (const u of [
    admin,
    managerWest,
    managerEast,
    sarah,
    john,
    maria,
    devon,
    riley,
  ]) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: "WELCOME",
        title: "Welcome to ShiftSync",
        body: `Signed in as ${u.role}. Explore your dashboard.`,
      },
    });
  }

  console.log("Seed complete.");
  console.log({
    admin: admin.email,
    managerWest: managerWest.email,
    managerEast: managerEast.email,
    sarah: sarah.email,
    john: john.email,
    premiumShiftId: premiumShift.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
