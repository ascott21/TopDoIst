// Display helpers shared by the ranked table and Up Next, so both show a
// task's link, project line, and due date the same way.

import { MS_PER_DAY, dueCalendarDate, dueInstant, dueTime } from './dueDate'

// The `todoist://` link opens the installed desktop or mobile app. It does
// nothing on a device without the app, which is why it's an opt-in,
// per-device setting.
export function taskUrl(task, { desktopApp = false } = {}) {
  return desktopApp ? `todoist://task?id=${task.id}` : `https://todoist.com/app/task/${task.id}`
}

// "Project" or "Project · Section" when the task sits in a section.
export function formatProjectMeta(task, projectsById, sectionsById) {
  const projectName = projectsById[task.project_id]?.name ?? '—'
  const section = task.section_id ? sectionsById[task.section_id] : null
  return section ? `${projectName} · ${section.name}` : projectName
}

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

// The next due date, never Todoist's recurrence text ("every year"). Within
// a week either way it reads relative ("in 3 days", "3 days ago"), bucketed
// by calendar day so "Today" holds all day. A set time is appended
// ("Today at 3:00 PM").
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

  const time = dueTime(due)
  if (time && !Number.isNaN(time.getTime())) return `${label} at ${TIME_FORMATTER.format(time)}`
  return label
}

// Uses the same due instant as scoring, so a task due today at 9:00 AM shows
// as overdue from 9:00 AM on, and a date-only task once its day has ended.
export function isOverdue(due) {
  const instant = dueInstant(due)
  return instant !== null && instant.getTime() < Date.now()
}
