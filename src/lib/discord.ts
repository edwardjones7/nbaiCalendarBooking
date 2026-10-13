import { DateTime } from "luxon";
import { MEETING } from "./config";
import type { Booking } from "./store";

export type NotifyResult = "sent" | "skipped" | "failed";

/** Posts a booking embed to the Discord webhook. Never throws. */
export async function notifyDiscord(b: Booking, kind: "booked" | "cancelled"): Promise<NotifyResult> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return "skipped";

  const et = DateTime.fromISO(b.start).setZone(MEETING.timezone).toFormat("ccc LLL d 'at' h:mm a 'ET'");
  const name = `${b.firstName} ${b.lastName}`.trim();
  const fields = [
    { name: "When", value: et, inline: true },
    { name: "Phone", value: b.phone, inline: true },
    { name: "Email", value: b.email, inline: true },
    b.company && { name: "Company", value: b.company, inline: true },
    b.setter && { name: "Booked by", value: b.setter, inline: true },
    b.meetLink && kind === "booked" && { name: "Google Meet", value: b.meetLink },
    b.notes && kind === "booked" && { name: "Notes", value: b.notes.slice(0, 1000) },
  ].filter(Boolean);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: kind === "booked" ? `📅 New call booked: ${name}` : `❌ Call cancelled: ${name}`,
            color: kind === "booked" ? 0x22c55e : 0xef4444,
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[discord]", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[discord]", e);
    return "failed";
  }
}
