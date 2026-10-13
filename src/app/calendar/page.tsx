import { Suspense } from "react";
import { connection } from "next/server";
import { DateTime } from "luxon";
import { MEETING } from "@/lib/config";
import CalendarView from "./calendar-view";

async function Calendar() {
  await connection();
  const today = DateTime.now().setZone(MEETING.timezone).toISODate()!;
  return <CalendarView today={today} />;
}

export default function CalendarPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-zinc-500">Booked calls · times shown in Eastern</p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
        <Calendar />
      </Suspense>
    </main>
  );
}
