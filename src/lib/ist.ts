// Helpers for India Standard Time (Asia/Kolkata) scheduling.

export function istHHMM(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function istLabel(date = new Date()): string {
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " IST"
  );
}

// Given a list of "HH:MM" IST times, return the next upcoming one as a label.
export function nextRunLabel(times: string[]): string | null {
  if (!times.length) return null;
  const now = istHHMM();
  const sorted = [...times].sort();
  const upcoming = sorted.find((t) => t > now);
  return upcoming ? `${upcoming} IST` : `${sorted[0]} IST (tomorrow)`;
}
