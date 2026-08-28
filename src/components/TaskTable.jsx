import { DRAG_TYPE } from './UpNext'
import PriorityDot from './PriorityDot'

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

// Always show the concrete due date, never Todoist's recurrence text (e.g.
// "every year") — the user just wants to see when it's next due, not that
// it repeats.
function formatDue(due) {
  if (!due?.date) return '—'
  const date = new Date(due.date)
  if (Number.isNaN(date.getTime())) return due.date
  return DATE_FORMATTER.format(date)
}

function isOverdue(due) {
  if (!due?.date) return false
  const date = new Date(due.date)
  if (Number.isNaN(date.getTime())) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return date < startOfToday
}

// Todoist's unified API v1 dropped the `url` field the old REST v2 tasks
// had, so we reconstruct the web-app deep link from the task id ourselves.
function taskUrl(task) {
  return task.url ?? `https://todoist.com/app/task/${task.id}`
}

export default function TaskTable({ ranked, projectsById }) {
  if (ranked.length === 0) {
    return <p className="empty">No tasks left in the list — everything's either done or in Up Next.</p>
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Project</th>
          <th>Due</th>
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ task, breakdown }) => {
          const title = [
            `priority: ${breakdown.priority.weighted}`,
            `due: ${breakdown.due.weighted}`,
            `staleness: ${breakdown.staleness.weighted}`,
            `labels: ${breakdown.labels.weighted}`,
          ].join('\n')

          return (
            <tr
              key={task.id}
              draggable
              className="draggable-row"
              title={title}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, task.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <td>
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
              </td>
              <td>{projectsById[task.project_id]?.name ?? '—'}</td>
              <td className={isOverdue(task.due) ? 'due-overdue' : undefined}>{formatDue(task.due)}</td>
              <td>
                <PriorityDot priority={task.priority} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
