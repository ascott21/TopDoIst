import { useDraggable } from '@dnd-kit/core'
import PriorityDot from './PriorityDot'
import CompleteCheckbox from './CompleteCheckbox'
import { taskUrl, formatProjectMeta } from '../lib/taskDisplay'
import { useCoarsePointer } from '../lib/useCoarsePointer'
import { dueCalendarDate, dueHasTime, dueTime } from '../lib/dueDate'

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
function formatDue(due) {
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

function isOverdue(due) {
  const date = dueCalendarDate(due)
  if (!date || Number.isNaN(date.getTime())) return false
  return daysFromToday(date) < 0
}

function TaskRow({ task, breakdown, projectsById, sectionsById, isCompleting, onComplete }) {
  // Deliberately not sortable — this list is algorithmically ranked, not
  // manually reorderable. Dragging one out just needs a source; where it's
  // dropped (Up Next) is what makes it sortable.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const isCoarse = useCoarsePointer()
  const dragProps = { ...attributes, ...listeners }

  const title = [
    `priority: ${breakdown.priority.weighted}`,
    `due: ${breakdown.due.weighted}`,
    `staleness: ${breakdown.staleness.weighted}`,
    `labels: ${breakdown.labels.weighted}`,
  ].join('\n')

  return (
    <tr
      ref={setNodeRef}
      className={`${isDragging ? 'is-dragging' : ''} ${!isCoarse ? 'row-draggable' : ''}`}
      title={title}
      // On a mouse/trackpad, the whole row can start a drag (a quick click
      // still reaches the link/checkbox — see CompleteCheckbox). On touch,
      // keep the drag zone confined to the checkbox handle so a scroll
      // gesture starting anywhere else on the row isn't hijacked.
      {...(isCoarse ? {} : dragProps)}
    >
      <td className="col-check">
        <CompleteCheckbox checked={isCompleting} onComplete={() => onComplete(task.id)} dragProps={isCoarse ? dragProps : {}} />
      </td>
      <td className="col-task">
        <a href={taskUrl(task)} target="_blank" rel="noreferrer">
          {task.content}
        </a>
        {task.labels?.length > 0 && (
          <span className="labels">
            {task.labels.map((l) => (
              <span key={l} className="label-chip">
                {l}
              </span>
            ))}
          </span>
        )}
        <div className="task-meta">
          <PriorityDot priority={task.priority} />
          <span className="task-meta-project">{formatProjectMeta(task, projectsById, sectionsById)}</span>
        </div>
      </td>
      <td className={isOverdue(task.due) ? 'due-overdue' : undefined}>{formatDue(task.due)}</td>
    </tr>
  )
}

export default function TaskTable({ ranked, projectsById, sectionsById, completingIds, onComplete }) {
  if (ranked.length === 0) {
    return <p className="empty">No tasks left in the list — everything's either done or in Up Next.</p>
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th className="col-check" aria-hidden="true"></th>
          <th className="col-task">Task</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ task, breakdown }) => (
          <TaskRow
            key={task.id}
            task={task}
            breakdown={breakdown}
            projectsById={projectsById}
            sectionsById={sectionsById}
            isCompleting={completingIds.has(task.id)}
            onComplete={onComplete}
          />
        ))}
      </tbody>
    </table>
  )
}
