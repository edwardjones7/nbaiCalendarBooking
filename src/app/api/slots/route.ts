import { slotsForDate } from "@/lib/slots";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Pass ?date=YYYY-MM-DD" }, { status: 400 });
  }
  try {
    return Response.json({ slots: await slotsForDate(date) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
