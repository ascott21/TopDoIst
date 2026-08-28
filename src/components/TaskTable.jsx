import { DRAG_TYPE } from './UpNext'

const PRIORITY_LABELS = { 4: 'P1', 3: 'P2', 2: 'P3', 1: 'P4' }

function formatDue(due) {
  if (!due) return '—'
  return due.string || due.date
}

export default function TaskTable({ ranked, projectsById }) {
  if (ranked.length === 0) {
    return <p className="empty">No tasks left in the list — everything's either done or in Up Next.</p>
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th className="col-rank">#</th>
          <th>Task</th>
          <th>Project</th>
          <th>Due</th>
          <th>Priority</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ task, total, breakdown }, i) => {
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
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, task.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <td className="col-rank">{i + 1}</td>
              <td>
                <a href={task.url} target="_blank" rel="noreferrer">
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
              <td>{formatDue(task.due)}</td>
              <td>{PRIORITY_LABELS[task.priority] ?? '—'}</td>
              <td className="col-score" title={title}>
                {total}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
