import { formatTaskDuration } from '../lib/duration'

// The task's own Todoist duration, e.g. "30m" or "1h 30m". Shows nothing
// for a task without one — a configured default duration is an
// assumption for scoring, not something the task actually says, so it
// isn't dressed up as one here (the score tooltip notes when it was used).
export default function DurationChip({ task }) {
  const label = formatTaskDuration(task)
  if (!label) return null

  return (
    <span className="task-duration" title={`Estimated duration: ${label}`}>
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 4.8V8l2.2 1.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  )
}
