import { promises as fs } from "node:fs";
import path from "node:path";

// Bookings live in a local JSON file. Fine for one running server.
// To deploy on serverless (Vercel), swap these functions for a real DB (e.g. Upstash Redis / Neon).
const FILE = path.join(process.cwd(), "data", "bookings.json");

export type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  setter?: string;
  meetLink?: string;
  leadTz: string;
  start: string; // ISO UTC
  end: string; // ISO UTC
  createdAt: string;
  status: "booked" | "cancelled";
};

async function readAll(): Promise<Booking[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(bookings: Booking[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(bookings, null, 2));
  await fs.rename(tmp, FILE);
}

// Serialize writes so two setters booking at once can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export async function listBookings(fromMs: number, toMs: number): Promise<Booking[]> {
  return (await readAll())
    .filter((b) => b.status === "booked" && Date.parse(b.end) > fromMs && Date.parse(b.start) < toMs)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Inserts the booking unless `isFree` says the slot is taken (checked inside the lock). */
export function addBooking(b: Booking, isFree: (existing: Booking[]) => boolean): Promise<boolean> {
  return locked(async () => {
    const all = await readAll();
    if (!isFree(all.filter((x) => x.status === "booked"))) return false;
    all.push(b);
    await writeAll(all);
    return true;
  });
}

export function cancelBooking(id: string): Promise<Booking | null> {
  return locked(async () => {
    const all = await readAll();
    const b = all.find((x) => x.id === id && x.status === "booked");
    if (!b) return null;
    b.status = "cancelled";
    await writeAll(all);
    return b;
  });
}
