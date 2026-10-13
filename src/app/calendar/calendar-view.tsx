"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import type { Booking } from "@/lib/store";

const TZ = "America/New_York";

export default function CalendarView({ today }: { today: string }) {
  const thisWeek = () => DateTime.fromISO(today, { zone: TZ }).startOf("week");
  const [weekStart, setWeekStart] = useState<DateTime>(thisWeek);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reload, setReload] = useState(0);

  const days = Array.from({ length: 5 }, (_, i) => weekStart.plus({ days: i }));

  useEffect(() => {
    let cancelled = false;
    const from = weekStart.toUTC().toISO()!;
    const to = weekStart.plus({ days: 7 }).toUTC().toISO()!;
    fetch(`/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setError(j.error);
        else setBookings(j.bookings);
      })
      .catch(() => !cancelled && setError("Couldn't load bookings."));
    return () => {
      cancelled = true;
    };
  }, [weekStart, reload]);

  function goTo(next: DateTime) {
    setBookings(null);
    setError("");
    setWeekStart(next);
  }

  async function cancel(b: Booking) {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setOpen(null);
      setReload((n) => n + 1);
    } catch (e) {
      setError((e as Error).message || "Cancel failed.");
    } finally {
      setCancelling(false);
    }
  }

  const et = (iso: string, fmt: string) => DateTime.fromISO(iso).setZone(TZ).toFormat(fmt);
  const total = bookings?.length ?? 0;
  const navBtn = "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => goTo(weekStart.minus({ weeks: 1 }))} className={navBtn}>
          ← Prev
        </button>
        <button onClick={() => goTo(thisWeek())} className={navBtn}>
          This week
        </button>
        <button onClick={() => goTo(weekStart.plus({ weeks: 1 }))} className={navBtn}>
          Next →
        </button>
        <span className="ml-2 text-sm font-medium">
          {weekStart.toFormat("LLL d")} – {weekStart.plus({ days: 4 }).toFormat("LLL d, yyyy")}
        </span>
        {bookings && (
          <span className="text-sm text-zinc-500">
            · {total} call{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-5">
        {days.map((d) => {
          const date = d.toISODate();
          const items = (bookings ?? []).filter((b) => et(b.start, "yyyy-MM-dd") === date);
          const isToday = date === today;
          return (
            <section key={date} className="min-h-32 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
              <h2 className={`mb-2 text-xs font-semibold ${isToday ? "text-zinc-900" : "text-zinc-500"}`}>
                {d.toFormat("ccc LLL d")}
                {isToday && <span className="ml-1.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">Today</span>}
              </h2>
              {!bookings ? (
                <p className="text-xs text-zinc-400">…</p>
              ) : items.length === 0 ? (
                <p className="text-xs text-zinc-400">No calls</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => setOpen(b)}
                        className="w-full rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-2 py-1.5 text-left hover:bg-emerald-100"
                      >
                        <div className="text-xs font-semibold">{et(b.start, "h:mm a")}</div>
                        <div className="truncate text-sm">{`${b.firstName} ${b.lastName}`.trim()}</div>
                        {b.company && <div className="truncate text-xs text-zinc-500">{b.company}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-zinc-500">{et(open.start, "cccc, LLL d · h:mm a")} ET</div>
            <h3 className="mt-1 text-xl font-semibold">{`${open.firstName} ${open.lastName}`.trim()}</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Email">
                <a className="underline" href={`mailto:${open.email}`}>
                  {open.email}
                </a>
              </Row>
              <Row label="Phone">
                <a className="underline" href={`tel:${open.phone}`}>
                  {open.phone}
                </a>
              </Row>
              {open.company && <Row label="Company">{open.company}</Row>}
              {open.meetLink && (
                <Row label="Google Meet">
                  <a className="text-blue-600 underline" href={open.meetLink} target="_blank">
                    {open.meetLink.replace("https://", "")}
                  </a>
                </Row>
              )}
              <Row label="Their time">{DateTime.fromISO(open.start).setZone(open.leadTz).toFormat("h:mm a ZZZZ")}</Row>
              {open.setter && <Row label="Booked by">{open.setter}</Row>}
              {open.notes && (
                <Row label="Notes">
                  <span className="whitespace-pre-wrap">{open.notes}</span>
                </Row>
              )}
            </dl>
            <div className="mt-6 flex justify-between gap-3">
              <button
                disabled={cancelling}
                onClick={() => cancel(open)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel booking"}
              </button>
              <button onClick={() => setOpen(null)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
