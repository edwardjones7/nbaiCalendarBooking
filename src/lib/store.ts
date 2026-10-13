import { Redis } from "@upstash/redis";

// Bookings live in Upstash Redis (connected via Vercel Storage), one hash: id -> Booking.
// Needs KV_REST_API_URL and KV_REST_API_TOKEN.
const KEY = "bookings";
const LOCK = "bookings:lock";

let client: Redis | null = null;
function redis() {
  if (!client) client = Redis.fromEnv();
  return client;
}

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
  // The client parses the JSON values for us.
  return ((await redis().hvals(KEY)) ?? []) as Booking[];
}

async function save(b: Booking) {
  await redis().hset(KEY, { [b.id]: b });
}

// Serialize writes across all server instances so two setters booking at once can't double-book.
async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const deadline = Date.now() + 10_000;
  while (!(await redis().set(LOCK, token, { nx: true, px: 10_000 }))) {
    if (Date.now() > deadline) throw new Error("Bookings are busy, try again.");
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    return await fn();
  } finally {
    // Only release the lock if it's still ours.
    await redis().eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) end return 0',
      [LOCK],
      [token],
    );
  }
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
    await save(b);
    return true;
  });
}

export function cancelBooking(id: string): Promise<Booking | null> {
  return locked(async () => {
    const b = await redis().hget<Booking>(KEY, id);
    if (!b || b.status !== "booked") return null;
    b.status = "cancelled";
    await save(b);
    return b;
  });
}
