import { DateTime } from "luxon";
import { MEETING } from "./config";
import { listBookings, type Booking } from "./store";

export type Slot = { start: string; label: string };

/** Open slots for a given ET calendar date (YYYY-MM-DD). */
export async function slotsForDate(date: string): Promise<Slot[]> {
  const day = DateTime.fromISO(date, { zone: MEETING.timezone });
  if (!day.isValid || !MEETING.workDays.includes(day.weekday)) return [];

  const open = day.set({ hour: MEETING.dayStartHour, minute: 0, second: 0, millisecond: 0 });
  const close = day.set({ hour: MEETING.dayEndHour, minute: 0, second: 0, millisecond: 0 });
  const earliest = DateTime.now().plus({ minutes: MEETING.minNoticeMin });
  const booked = await listBookings(open.toMillis(), close.toMillis());

  const slots: Slot[] = [];
  for (let t = open; t.plus({ minutes: MEETING.durationMin }) <= close; t = t.plus({ minutes: MEETING.slotStepMin })) {
    if (t < earliest) continue;
    if (overlaps(booked, t.toMillis(), t.plus({ minutes: MEETING.durationMin }).toMillis())) continue;
    slots.push({ start: t.toUTC().toISO()!, label: t.toFormat("h:mm a") });
  }
  return slots;
}

export function overlaps(bookings: Booking[], start: number, end: number) {
  return bookings.some((b) => start < Date.parse(b.end) && end > Date.parse(b.start));
}

/** True if `startISO` lands on the slot grid inside business hours and isn't in the past. Ignores existing bookings. */
export function isValidSlotTime(startISO: string): boolean {
  const t = DateTime.fromISO(startISO).setZone(MEETING.timezone);
  if (!t.isValid || !MEETING.workDays.includes(t.weekday)) return false;
  if (t < DateTime.now().plus({ minutes: MEETING.minNoticeMin })) return false;
  const mins = t.hour * 60 + t.minute - MEETING.dayStartHour * 60;
  return (
    t.second === 0 &&
    mins >= 0 &&
    mins % MEETING.slotStepMin === 0 &&
    t.hour * 60 + t.minute + MEETING.durationMin <= MEETING.dayEndHour * 60
  );
}
