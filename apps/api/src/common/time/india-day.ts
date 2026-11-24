// "Today" for the shop means today in India, whatever time zone the server runs in
// (a cloud server is usually on UTC, which would start the day at 5:30 am).
// India has one time zone, UTC+5:30, and no daylight saving, so a fixed offset is exact.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The start (inclusive) and end (exclusive) of the India calendar day that contains `now`. */
export function indiaDayBounds(now: Date): { start: Date; end: Date; date: string } {
  const shifted = now.getTime() + IST_OFFSET_MS; // the clock on the wall in India, read as if it were UTC
  const startShifted = Math.floor(shifted / DAY_MS) * DAY_MS;
  const start = new Date(startShifted - IST_OFFSET_MS);
  return {
    start,
    end: new Date(start.getTime() + DAY_MS),
    date: new Date(startShifted).toISOString().slice(0, 10), // YYYY-MM-DD in India
  };
}
