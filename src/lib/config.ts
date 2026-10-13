// Single place to tweak the meeting setup.
export const MEETING = {
  title: process.env.MEETING_TITLE || "Strategy Call",
  durationMin: 30,
  slotStepMin: 30,
  timezone: "America/New_York", // business hours are defined in this zone
  dayStartHour: 9, // 9:00 AM ET
  dayEndHour: 17, // last call ends by 5:00 PM ET
  workDays: [1, 2, 3, 4, 5], // Luxon weekday: 1 = Mon ... 7 = Sun
  minNoticeMin: 30, // can't book a slot starting sooner than this
  daysAhead: 21, // how far out the date picker goes
};

export const BUSINESS_NAME = process.env.BUSINESS_NAME || "Our Team";

export const LEAD_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
];
