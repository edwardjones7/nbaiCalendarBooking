"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Day = { date: string; dow: string; label: string };
type Slot = { start: string; label: string };
type Result = { discord: "sent" | "skipped" | "failed"; meet: "created" | "skipped" | "failed"; meetLink?: string; summary: string };

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", company: "", notes: "" };

export default function BookingForm({ days, timezones }: { days: Day[]; timezones: { value: string; label: string }[] }) {
  const [lead, setLead] = useState(EMPTY);
  const [leadTz, setLeadTz] = useState(timezones[0].value);
  const [setter, setSetter] = useState("");
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState("");
  const [start, setStart] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [reload, setReload] = useState(0);

  // Remember who's booking on this device.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after mount
      setSetter(localStorage.getItem("setter") ?? "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    fetch(`/api/slots?date=${date}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setSlotsError(j.error);
        else setSlots(j.slots);
      })
      .catch(() => !cancelled && setSlotsError("Couldn't load times."));
    return () => {
      cancelled = true;
    };
  }, [date, reload]);

  // Clear the slot grid, then the effect above refetches.
  function loadSlots(nextDate = date) {
    setSlots(null);
    setSlotsError("");
    setStart("");
    setDate(nextDate);
    setReload((n) => n + 1);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setLead((l) => ({ ...l, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) return setError("Pick a time slot.");
    setSubmitting(true);
    setError("");
    try {
      localStorage.setItem("setter", setter);
    } catch {}
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, leadTz, setter, start }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Booking failed.");
        if (res.status === 409) loadSlots();
        return;
      }
      const day = days.find((d) => d.date === date);
      const slot = slots?.find((s) => s.start === start);
      setResult({
        discord: j.discord,
        meet: j.meet,
        meetLink: j.booking.meetLink,
        summary: `${lead.firstName} ${lead.lastName}`.trim() + ` · ${day?.dow} ${day?.label} at ${slot?.label} ET`,
      });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setLead(EMPTY);
    setResult(null);
    loadSlots();
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-1 text-sm font-medium text-emerald-600">Booked</div>
        <h2 className="text-xl font-semibold">{result.summary}</h2>
        {result.meetLink ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
            <a href={result.meetLink} target="_blank" className="min-w-0 flex-1 truncate font-medium text-blue-600 underline">
              {result.meetLink}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(result.meetLink!)}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-zinc-100"
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Google Meet: {result.meet === "failed" ? <span className="text-red-600">failed (check server logs)</span> : "not connected"}
          </p>
        )}
        <p className="mt-3 text-sm">
          Discord notification:{" "}
          <span
            className={
              result.discord === "sent" ? "text-emerald-600" : result.discord === "failed" ? "text-red-600" : "text-zinc-400"
            }
          >
            {result.discord === "skipped" ? "skipped (no webhook set)" : result.discord}
          </span>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={reset} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Book another lead
          </button>
          <Link href="/calendar" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            View calendar
          </Link>
        </div>
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
  const label = "mb-1 block text-xs font-medium text-zinc-600";

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Lead info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>First name *</label>
            <input required className={input} value={lead.firstName} onChange={set("firstName")} />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input className={input} value={lead.lastName} onChange={set("lastName")} />
          </div>
          <div className="col-span-2">
            <label className={label}>Email *</label>
            <input required type="email" className={input} value={lead.email} onChange={set("email")} />
          </div>
          <div>
            <label className={label}>Phone *</label>
            <input required type="tel" placeholder="(555) 123-4567" className={input} value={lead.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className={label}>Lead&apos;s timezone</label>
            <select className={input} value={leadTz} onChange={(e) => setLeadTz(e.target.value)}>
              {timezones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={label}>Company</label>
            <input className={input} value={lead.company} onChange={set("company")} />
          </div>
          <div className="col-span-2">
            <label className={label}>Notes (only the team sees these)</label>
            <textarea rows={3} className={input} value={lead.notes} onChange={set("notes")} />
          </div>
          <div className="col-span-2">
            <label className={label}>Booked by</label>
            <input placeholder="Your name" className={input} value={setter} onChange={(e) => setSetter(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Pick a time (ET)</h2>
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => (
            <button
              type="button"
              key={d.date}
              onClick={() => loadSlots(d.date)}
              className={`flex min-w-16 shrink-0 flex-col items-center whitespace-nowrap rounded-lg border px-3 py-2 text-xs ${
                d.date === date ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <span className="font-medium">{d.dow}</span>
              <span className={d.date === date ? "text-zinc-300" : "text-zinc-500"}>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-40">
          {slotsError ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{slotsError}</p>
          ) : !slots ? (
            <p className="text-sm text-zinc-400">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-zinc-500">No open times this day. Try another.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s.start}
                  onClick={() => setStart(s.start)}
                  className={`rounded-lg border px-2 py-2 text-sm ${
                    s.start === start ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !start}
          className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? "Booking…" : start ? "Book call" : "Select a time"}
        </button>
      </section>
    </form>
  );
}
