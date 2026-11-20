// Lead times: when a task becomes workable, given Todoist has no start date.
//
// A lead-time label (e.g. "Lead3") says how far ahead of its due date a task
// can be started. The task stays out of the ranked list until then, and sits
// in the "Not yet" section instead. Once it opens it ranks exactly like any
// other task — the lead time only decides *whether* it shows, never its
// score.
//
// Rules:
//   - No due date, or no lead-time label: always available (as before).
//   - Day-based leads open at local midnight N days before the due date.
//   - Hour-based leads open N hours before the due time. A date-only due
//     date has no time to count back from, so hours round down to whole
//     days before the due date (AtTime = 1h on a date-only task opens at
//     midnight of the due day, same as SameDay).
//   - More than one lead-time label: the longest lead wins (earliest
//     opening), so a tagging mistake errs toward visible-and-fixable rather
//     than hidden. It's flagged as a conflict, since it's always an input
//     error.

import { dueCalendarDate, dueHasTime, dueInstant } from './dueDate'

export const LEAD_UNITS = ['days', 'hours']

// label (lowercased) -> { amount, unit }
export const DEFAULT_LEAD_TIMES = {
  sameday: { amount: 0, unit: 'days' },
  attime: { amount: 1, unit: 'hours' },
  lead3: { amount: 3, unit: 'days' },
  lead7: { amount: 7, unit: 'days' },
  lead30: { amount: 30, unit: 'days' },
}

const MS_PER_HOUR = 1000 * 60 * 60

function daysBefore(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

// The instant a single lead time opens for a given due date.
function opensAt(due, { amount, unit }) {
  const dueDay = dueCalendarDate(due) // local midnight of the due day
  if (!dueDay || Number.isNaN(dueDay.getTime())) return null
  if (unit === 'hours') {
    if (dueHasTime(due)) return new Date(dueInstant(due).getTime() - amount * MS_PER_HOUR)
    return daysBefore(dueDay, Math.floor(amount / 24))
  }
  return daysBefore(dueDay, amount)
}

// Validates whatever came out of localStorage (or an edit) into a clean
// { label: { amount, unit } } map, dropping anything malformed.
export function normalizeLeadTimes(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LEAD_TIMES }
  const out = {}
  for (const [label, value] of Object.entries(raw)) {
    const amount = Number(value?.amount)
    const unit = LEAD_UNITS.includes(value?.unit) ? value.unit : 'days'
    const key = label.trim().toLowerCase()
    if (key && Number.isFinite(amount) && amount >= 0) out[key] = { amount, unit }
  }
  return out
}

// Describes a task's lead-time situation at `now`:
//   leadLabels   — the task's labels that are configured lead times (as written on the task)
//   activeLabel  — the one in effect (longest lead), or null
//   opensAt      — Date the task becomes available, or null if it's always available
//   isAvailable  — whether it belongs in the ranked list right now
//   hasConflict  — more than one lead-time label on the task
export function leadInfo(task, leadTimes, now = new Date()) {
  const leadLabels = (task.labels ?? []).filter((l) => Object.hasOwn(leadTimes, l.toLowerCase()))
  const base = { leadLabels, activeLabel: null, opensAt: null, isAvailable: true, hasConflict: leadLabels.length > 1 }
  if (leadLabels.length === 0 || !task.due?.date) return base

  let earliest = null
  let activeLabel = null
  for (const label of leadLabels) {
    const at = opensAt(task.due, leadTimes[label.toLowerCase()])
    if (at && (earliest === null || at < earliest)) {
      earliest = at
      activeLabel = label
    }
  }
  if (!earliest) return base

  return { ...base, activeLabel, opensAt: earliest, isAvailable: now >= earliest }
}

export function formatLeadTime({ amount, unit }) {
  const singular = unit === 'hours' ? 'hour' : 'day'
  return `${amount} ${amount === 1 ? singular : `${singular}s`}`
}
