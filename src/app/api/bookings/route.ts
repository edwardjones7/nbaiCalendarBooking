import { listBookings } from "@/lib/store";

// GET /api/bookings?from=ISO&to=ISO
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = Date.parse(params.get("from") ?? "");
  const to = Date.parse(params.get("to") ?? "");
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return Response.json({ error: "Pass ?from=ISO&to=ISO" }, { status: 400 });
  }
  return Response.json({ bookings: await listBookings(from, to) });
}
