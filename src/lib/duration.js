// Helpers for Todoist's task `duration` field, shared by scoring, the
// per-task duration chip, and the Up Next total so they all agree on what
// a duration means in minutes.
//
// Todoist represents a duration as { amount, unit } with unit "minute" or
// "day" (or the whole field is null when none is set). A day-based
// duration is counted as one workday rather than 24 hours — "this takes a
// day" means a day of work, not a day and a night.

export const WORKDAY_MINUTES = 8 * 60

// The task's own duration in minutes, or null when it has none (or one we
// can't make sense of). Never falls back to a default — see
// effectiveDurationMinutes for that.
export function taskDurationMinutes(task) {
  const duration = task?.duration
  if (!duration) return null
  const amount = Number(duration.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (duration.unit === 'day') return amount * WORKDAY_MINUTES
  if (duration.unit === 'minute') return amount
  return null
}

// The duration to use for a task: its own if set, otherwise the
// user-configured default (null/0 meaning "no default"). `isDefault` says
// which one it was, so the UI can be upfront about assumed durations.
export function effectiveDurationMinutes(task, defaultMinutes) {
  const own = taskDurationMinutes(task)
  if (own !== null) return { minutes: own, isDefault: false }
  if (defaultMinutes > 0) return { minutes: defaultMinutes, isDefault: true }
  return { minutes: null, isDefault: false }
}

// "45m", "1h", "1h 30m", "16h" — hours and minutes only, so totals that
// include day-based durations read as working hours.
export function formatMinutes(minutes) {
  const rounded = Math.round(minutes)
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// How a single task's own duration is shown: day-based ones keep their
// unit ("2d") the way they were entered in Todoist; minute-based ones use
// formatMinutes. Null when the task has no duration.
export function formatTaskDuration(task) {
  const minutes = taskDurationMinutes(task)
  if (minutes === null) return null
  if (task.duration.unit === 'day') return `${Number(task.duration.amount)}d`
  return formatMinutes(minutes)
}
