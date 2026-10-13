// Creates a Google Meet room per booking via the Meet REST API.
// Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (run `npm run google-auth`).

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const j = await res.json();
  cached = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

export type MeetResult = { status: "created" | "skipped" | "failed"; link?: string };

/** Never throws; a Meet failure shouldn't block the booking. */
export async function createMeet(): Promise<MeetResult> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return { status: "skipped" };
  try {
    const res = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      // OPEN = anyone with the link joins directly, no host approval needed.
      body: JSON.stringify({ config: { accessType: "OPEN" } }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const space = await res.json();
    return { status: "created", link: space.meetingUri };
  } catch (e) {
    console.error("[meet]", e);
    return { status: "failed" };
  }
}
