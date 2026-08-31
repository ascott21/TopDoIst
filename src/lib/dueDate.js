// Shared helpers for interpreting Todoist's `due` object. Kept in one place
// so scoring (which needs a precise instant, including time-of-day) and
// display (which needs a calendar day, ignoring time-of-day) can't drift
// out of sync on how a bare "YYYY-MM-DD" date gets parsed.
//
// `new Date('YYYY-MM-DD')` parses as UTC midnight, which silently shifts
// the effective calendar day for anyone not at UTC — every helper here
// works from the date string's Y-M-D components directly instead.

function parseDateParts(dateStr) {
  // dateStr is at least "YYYY-MM-DD"; ignore any time part for the
  // calendar-day components.
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

// The calendar day the task is due, as a local midnight Date — for display
// bucketing (Today/Tomorrow/in N days), where time-of-day doesn't matter.
export function dueCalendarDate(due) {
  if (!due?.date) return null
  const { y, m, d } = parseDateParts(due.date)
  return new Date(y, m - 1, d)
}

// The precise instant the task is due — for scoring urgency. Uses
// Todoist's actual time when the task has one; otherwise defaults to
// 23:59:59 local time on the due date, so a same-day task without a set
// time is treated as due at the end of the day rather than being
// indistinguishable from midnight.
export function dueInstant(due) {
  if (!due?.date) return null
  const raw = due.date
  if (raw.length <= 10) {
    const { y, m, d } = parseDateParts(raw)
    return new Date(y, m - 1, d, 23, 59, 59)
  }
  // Has an explicit time (and possibly a timezone offset or "Z") — JS's
  // ISO 8601 parsing already does the right thing with that as-is.
  return new Date(raw)
}
