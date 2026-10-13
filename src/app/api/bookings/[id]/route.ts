import { cancelBooking } from "@/lib/store";
import { notifyDiscord } from "@/lib/discord";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/bookings/[id]">) {
  const { id } = await ctx.params;
  const b = await cancelBooking(id);
  if (!b) return Response.json({ error: "Booking not found" }, { status: 404 });
  const discord = await notifyDiscord(b, "cancelled");
  return Response.json({ ok: true, discord });
}
