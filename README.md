# nbaiCalendarBooking

Internal tool for setters: enter a lead's info, pick an open slot, and book the call. Each booking gets its own Google Meet link, and every booking and cancellation posts to Discord.

- **Book a lead** (`/`): lead form plus open 30-minute slots, weekdays 9–5 ET. Booked slots disappear automatically.
- **Calendar** (`/calendar`): week view of booked calls. Click a call to see the lead's details and Meet link, or to cancel it.

## Setup
1. In Discord, open the channel's **Settings → Integrations → Webhooks → New Webhook** and copy the URL.
2. Copy `.env.example` to `.env.local` and paste the webhook into `DISCORD_WEBHOOK_URL`. You can also set `APP_PASSWORD`.
3. Run:
   ```
   npm install
   npm run dev      # http://localhost:3000
   ```

If `APP_PASSWORD` is set, the browser asks for a login. The username can be anything; the password is `APP_PASSWORD`.

## Google Meet setup (one time, ~10 min)
Bookings still work without this step; they just won't get a Meet link.

1. Go to https://console.cloud.google.com and create a new project.
2. Go to **APIs & Services → Library**, search for **Google Meet REST API**, and click **Enable**.
3. Open **Google Auth Platform** (the OAuth consent screen). Click **Get started**, enter an app name and your email, choose **External**, and finish.
4. Under **Audience**, click **Publish app**.
   Don't skip this. If the app stays in "Testing", Google expires the sign-in after 7 days and Meet links stop working.
5. Under **Clients**, click **Create client** and choose **Desktop app**. Copy the client ID and secret into `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. Run `npm run google-auth`, open the link it prints, and sign in with the Google account that should host the calls.
   Google warns that the app isn't verified. Click **Advanced → Go to (app name)** and allow it. The token saves itself to `.env.local`.
7. Restart `npm run dev`.

The Meet rooms belong to the account you signed in with. They are created as open rooms, so anyone with the link joins directly without the host admitting them.

## Where bookings are stored
Bookings are saved in Upstash Redis, connected to the Vercel project under **Storage** (database `upstash-kv-amber-lens`, free plan). Vercel sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically; for local dev, copy them into `.env.local` (Storage → the database → Show secret). Local dev and the live site share the same bookings.

## Customizing
- Meeting length, hours, days and booking window: `src/lib/config.ts`
- Discord message format: `src/lib/discord.ts`
