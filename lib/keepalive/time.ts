const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function parseWhenExpression(
  expression: string,
  now = new Date()
): Date | null {
  const trimmed = expression.trim().toLowerCase();

  if (trimmed === "tomorrow") {
    return withTime(addDays(now, 1), 9, 0);
  }

  const tomorrowTimeMatch = trimmed.match(/^tomorrow(?:\s+(.+))?$/);

  if (tomorrowTimeMatch) {
    const parsedTime = parseClock(tomorrowTimeMatch[1]);
    if (!parsedTime) {
      return null;
    }
    return withTime(addDays(now, 1), parsedTime.hours, parsedTime.minutes);
  }

  const inMatch = trimmed.match(
    /^in\s+(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks)$/
  );

  if (inMatch) {
    const [, amountRaw, unit] = inMatch;
    const amount = Number(amountRaw);

    if (unit.startsWith("minute")) {
      return new Date(now.getTime() + amount * 60 * 1000);
    }

    if (unit.startsWith("hour")) {
      return new Date(now.getTime() + amount * 60 * 60 * 1000);
    }

    if (unit.startsWith("day")) {
      return withTime(addDays(now, amount), 9, 0);
    }

    return withTime(addDays(now, amount * 7), 9, 0);
  }

  const dayTimeMatch = trimmed.match(
    /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s+(.+))?$/
  );

  if (dayTimeMatch) {
    const [, day, time] = dayTimeMatch;
    const nextDay = nextWeekday(now, day);
    const parsedTime = parseClock(time);
    if (!parsedTime) {
      return null;
    }
    return withTime(nextDay, parsedTime.hours, parsedTime.minutes);
  }

  const clock = parseClock(trimmed);

  if (clock) {
    const candidate = withTime(now, clock.hours, clock.minutes);
    if (candidate <= now) {
      return addDays(candidate, 1);
    }
    return candidate;
  }

  const native = new Date(expression);
  return Number.isNaN(native.getTime()) ? null : native;
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDistanceFromNow(date: Date, now = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (Math.abs(diffHours) < 24) {
    const hours = Math.max(Math.abs(diffHours), 1);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const days = Math.max(Math.abs(diffDays), 1);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function parseClock(input?: string): { hours: number; minutes: number } | null {
  if (!input) {
    return { hours: 9, minutes: 0 };
  }

  const trimmed = input.trim().toLowerCase();

  const match = trimmed.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  );

  if (!match) {
    return null;
  }

  const [, hoursRaw, minutesRaw, period] = match;
  let hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? "0");

  if (period === "pm" && hours < 12) {
    hours += 12;
  }

  if (period === "am" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

function nextWeekday(now: Date, dayName: string): Date {
  const targetDay = DAY_NAMES.indexOf(
    dayName as (typeof DAY_NAMES)[number]
  );
  const current = now.getDay();
  let delta = targetDay - current;

  if (delta <= 0) {
    delta += 7;
  }

  return addDays(now, delta);
}

function withTime(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
