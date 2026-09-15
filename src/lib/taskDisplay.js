// Small display helpers shared between the ranked task table and Up Next,
// so the two don't drift out of sync on how a task's link, meta line, or
// due date is shown.

import { dueCalendarDate, dueHasTime, dueTime } from './dueDate'

// Todoist's unified API v1 dropped the `url` field the old REST v2 tasks
// had, so we reconstruct the web-app deep link from the task id ourselves.
//
// Todoist's desktop (and mobile) apps register as the handler for a
// `todoist://` URI scheme, so a `todoist://task?id=<id>` link opens
// straight into the native app instead of a browser tab — but only on a
// machine that actually has it installed and registered; anywhere else
// the link just does nothing when clicked, no fallback. That's why this
// is opt-in per device (see the "Open tasks in" setting) rather than the
// default for everyone using a shared deployment of this app.
export function taskUrl(task, { desktopApp = false } = {}) {
  if (desktopApp) return `todoist://task?id=${task.id}`
  return task.url ?? `https://todoist.com/app/task/${task.id}`
}

// "Project" or "Project · Section" when the task sits in a section.
export function formatProjectMeta(task, projectsById, sectionsById) {
  const projectName = projectsById[task.project_id]?.name ?? '—'
  const section = task.section_id ? sectionsById[task.section_id] : null
  return section ? `${projectName} · ${section.name}` : projectName
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Whole-day difference between a due date and today (positive = future).
function daysFromToday(date) {
  return Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / MS_PER_DAY)
}

// Always show the concrete due date, never Todoist's recurrence text (e.g.
// "every year") — the user just wants to see when it's next due, not that
// it repeats. Anything within a week either direction reads as relative
// ("in 3 days" / "3 days ago") rather than a calendar date. Bucketed by
// calendar day (ignoring time-of-day), unlike the scoring engine which
// cares about the exact hour — "Today" should read as "Today" all day.
// When the task has an actual due time set, it's appended (e.g. "Today at
// 3:00 PM") — never fabricated for a date-only due date.
export function formatDue(due) {
  const date = dueCalendarDate(due)
  if (!date || Number.isNaN(date.getTime())) return due?.date ?? '—'

  const diff = daysFromToday(date)
  let label
  if (diff === 0) label = 'Today'
  else if (diff === 1) label = 'Tomorrow'
  else if (diff === -1) label = 'Yesterday'
  else if (diff > 1 && diff <= 7) label = `in ${diff} days`
  else if (diff < -1 && diff >= -7) label = `${-diff} days ago`
  else label = DATE_FORMATTER.format(date)

  if (dueHasTime(due)) {
    const time = dueTime(due)
    if (time && !Number.isNaN(time.getTime())) {
      return `${label} at ${TIME_FORMATTER.format(time)}`
    }
  }
  return label
}

export function isOverdue(due) {
  const date = dueCalendarDate(due)
  if (!date || Number.isNaN(date.getTime())) return false
  return daysFromToday(date) < 0
}
