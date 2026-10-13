// One-time: sign in with Google and save GOOGLE_REFRESH_TOKEN into .env.local.
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first. See README.
import http from "node:http";
import fs from "node:fs";

const ENV = ".env.local";
const env = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
const get = (k) => process.env[k] || env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();

const clientId = get("GOOGLE_CLIENT_ID");
const clientSecret = get("GOOGLE_CLIENT_SECRET");
if (!clientId || !clientSecret) {
  console.error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local first (see README).");
  process.exit(1);
}

const PORT = 53682;
const redirect = `http://localhost:${PORT}`;
const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/meetings.space.created",
  });

http
  .createServer(async (req, res) => {
    const params = new URL(req.url, redirect).searchParams;
    const code = params.get("code");
    if (!code) {
      res.end(params.get("error") ? `Error: ${params.get("error")}` : "Waiting for Google...");
      return;
    }
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }),
    });
    const j = await r.json();
    if (!j.refresh_token) {
      res.end("Failed, check the terminal.");
      console.error("No refresh token returned:", j);
      process.exit(1);
    }
    const current = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
    const line = `GOOGLE_REFRESH_TOKEN=${j.refresh_token}`;
    const next = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(current)
      ? current.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
      : current.replace(/\n?$/, "\n") + line + "\n";
    fs.writeFileSync(ENV, next);
    res.end("Connected! You can close this tab.");
    console.log("\nSaved GOOGLE_REFRESH_TOKEN to .env.local. Restart `npm run dev`.");
    process.exit(0);
  })
  .listen(PORT, () => {
    console.log("Open this link and sign in with the Google account that should host the Meets:\n");
    console.log(authUrl + "\n");
  });
