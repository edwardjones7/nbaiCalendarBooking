import { DateTime } from "luxon";
import { MEETING, LEAD_TIMEZONES } from "@/lib/config";
import { addBooking, type Booking } from "@/lib/store";
import { isValidSlotTime, overlaps } from "@/lib/slots";
import { notifyDiscord } from "@/lib/discord";
import { createMeet } from "@/lib/meet";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const str = (k: string) => (typeof body[k] === "string" ? body[k].trim() : "");
  const firstName = str("firstName");
  const email = str("email").toLowerCase();
  const phone = str("phone");
  const start = str("start");

  const errors: string[] = [];
  if (!firstName) errors.push("First name is required.");
  if (!EMAIL_RE.test(email)) errors.push("A valid email is required.");
  if (phone.replace(/\D/g, "").length < 7) errors.push("A valid phone number is required.");
  if (!start) errors.push("Pick a time slot.");
  else if (!isValidSlotTime(start)) errors.push("That time isn't bookable.");
  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });

  const startDt = DateTime.fromISO(start).toUTC();
  const b: Booking = {
    id: crypto.randomUUID(),
    firstName,
    lastName: str("lastName"),
    email,
    phone,
    company: str("company") || undefined,
    notes: str("notes") || undefined,
    setter: str("setter") || undefined,
    leadTz: LEAD_TIMEZONES.some((z) => z.value === str("leadTz")) ? str("leadTz") : MEETING.timezone,
    start: startDt.toISO()!,
    end: startDt.plus({ minutes: MEETING.durationMin }).toISO()!,
    createdAt: new Date().toISOString(),
    status: "booked",
  };

  try {
    // An unused Meet room is harmless if the slot turns out to be taken.
    const meet = await createMeet();
    b.meetLink = meet.link;

    const saved = await addBooking(b, (existing) => !overlaps(existing, Date.parse(b.start), Date.parse(b.end)));
    if (!saved) {
      return Response.json({ error: "That slot was just taken. Pick another." }, { status: 409 });
    }
    const discord = await notifyDiscord(b, "booked");
    return Response.json({ ok: true, booking: b, discord, meet: meet.status });
  } catch (e) {
    console.error("[book]", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
