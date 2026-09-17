# ShiftSync — Coastal Eats Multi-Location Scheduling

Web app for scheduling staff across 4 Coastal Eats locations in 2 timezones.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL + Prisma 5
- Auth.js (credentials)
- Server-Sent Events for realtime updates

## Quick start

1. Copy `.env.example` values into `.env` (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`)
2. Start Postgres (Docker):

```bash
docker start shiftsync-pg
# or first time:
# docker run --name shiftsync-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shiftsync -p 5432:5432 -d postgres:16
```

3. Install & migrate & seed:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000

## Demo logins (password for all: `password123`)

| Role | Email |
| --- | --- |
| Admin | admin@coastaleats.test |
| Manager (West) | manager.west@coastaleats.test |
| Manager (East) | manager.east@coastaleats.test |
| Staff (Timezone Tangle) | staff.sarah@coastaleats.test |
| Staff (coverage alt) | staff.john@coastaleats.test |
| Staff (OT trap) | staff.devon@coastaleats.test |
| Staff (fairness) | staff.riley@coastaleats.test |

## Intentional ambiguity decisions

1. **De-certified staff** — Historical assignments remain. New assignments are blocked.
2. **Desired hours vs availability** — Desired hours are a fairness target only. Availability is a hard constraint.
3. **Consecutive days** — Any assigned shift that calendar day counts (1h == 11h for streak).
4. **Edit after approved swap** — Editing a shift cancels pending swaps; further edits re-validate via the constraint engine.
5. **Timezone boundary locations** — Each location has exactly one IANA timezone.

## Availability semantics

Staff enter recurring availability in **their user timezone**. Shifts are stored in UTC and displayed in the **location timezone**.

## Evaluation scenario walkthrough

1. **Sunday Night Chaos** — Manager West → unassigned Sunday bartender → what-if Sarah → UNAVAILABLE + John suggested → assign John.
2. **Overtime Trap** — Assign Devon a long Friday Seattle shift → weekly warnings + OT dashboard.
3. **Timezone Tangle** — Sarah 9–5 Pacific vs Miami ET morning shift → UNAVAILABLE.
4. **Simultaneous Assignment** — Two managers, same `shiftVersion` → first wins, second gets VERSION_CONFLICT.
5. **Fairness Complaint** — Fairness page shows premium Sat skew (John vs Riley).
6. **Regret Swap** — Staff swap → cancel before manager approval → original assignment stays.

## Known limitations

- Email is simulated (`emailSimulatedAt`), not sent via SMTP.
- SSE uses DB polling (~1.5s).
- Fairness score is a simple variance heuristic.

## Deploy notes

- Vercel + Neon Postgres
- Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `SCHEDULE_EDIT_CUTOFF_HOURS=48`
- Keep Prisma at **5.22** (curriculum / this repo); do not jump to Prisma 7 without config changes.
