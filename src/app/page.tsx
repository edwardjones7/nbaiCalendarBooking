import { Suspense } from "react";
import { connection } from "next/server";
import { DateTime } from "luxon";
import { BUSINESS_NAME, LEAD_TIMEZONES, MEETING } from "@/lib/config";
import BookingForm from "./booking-form";

// Upcoming workdays in business timezone for the date picker; computed per request.
async function Booking() {
  await connection();
  const days: { date: string; dow: string; label: string }[] = [];
  let d = DateTime.now().setZone(MEETING.timezone).startOf("day");
  const last = d.plus({ days: MEETING.daysAhead });
  for (; d <= last; d = d.plus({ days: 1 })) {
    if (!MEETING.workDays.includes(d.weekday)) continue;
    days.push({ date: d.toISODate()!, dow: d.toFormat("ccc"), label: d.toFormat("LLL d") });
  }
  return <BookingForm days={days} timezones={LEAD_TIMEZONES} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-zinc-500">{BUSINESS_NAME}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Book a lead</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {MEETING.title} · {MEETING.durationMin} min · times shown in Eastern
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
        <Booking />
      </Suspense>
    </main>
  );
}
