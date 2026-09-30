// Helpers for reading Todoist's `due` object, shared by scoring (which needs
// the exact due instant) and display (which needs the calendar day).
//
// `due.date` is a bare "YYYY-MM-DD" for a date-only due date, or a full ISO
// datetime when a time is set. `new Date('YYYY-MM-DD')` would parse the bare
// form as UTC midnight, shifting the day for anyone not at UTC, so date-only
// values are built from their Y-M-D parts in local time instead.

export const MS_PER_HOUR = 1000 * 60 * 60
export const MS_PER_DAY = MS_PER_HOUR * 24

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

// The calendar day the task is due, as local midnight.
export function dueCalendarDate(due) {
  if (!due?.date) return null
  const { y, m, d } = parseDateParts(due.date)
  return new Date(y, m - 1, d)
}

export function dueHasTime(due) {
  return !!due?.date && due.date.length > 10
}

// The exact moment the task is due. A date-only task counts as due at
// 23:59:59 local time, so it stays "due today" until the day ends.
export function dueInstant(due) {
  if (!due?.date) return null
  if (dueHasTime(due)) return new Date(due.date)
  const { y, m, d } = parseDateParts(due.date)
  return new Date(y, m - 1, d, 23, 59, 59)
}

// The due time, only when one is actually set — unlike dueInstant, never the
// end-of-day stand-in, so display doesn't show a time the user never chose.
export function dueTime(due) {
  return dueHasTime(due) ? new Date(due.date) : null
}
