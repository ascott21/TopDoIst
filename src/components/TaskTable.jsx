import { useDraggable } from '@dnd-kit/core'
import PriorityDot from './PriorityDot'
import CompleteCheckbox from './CompleteCheckbox'
import TaskIndicators from './TaskIndicators'
import { taskUrl, formatProjectMeta, formatDue, isOverdue } from '../lib/taskDisplay'
import { useCoarsePointer } from '../lib/useCoarsePointer'

function TaskRow({ task, breakdown, projectsById, sectionsById, isCompleting, onComplete, hasComments }) {
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
          <TaskIndicators hasDescription={!!task.description?.trim()} hasComments={hasComments} />
        </div>
      </td>
      <td className={isOverdue(task.due) ? 'due-overdue' : undefined}>{formatDue(task.due)}</td>
    </tr>
  )
}

export default function TaskTable({ ranked, projectsById, sectionsById, completingIds, onComplete, taskIdsWithComments, emptyMessage }) {
  if (ranked.length === 0) {
    return <p className="empty">{emptyMessage ?? "No tasks left in the list — everything's either done or in Up Next."}</p>
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
            hasComments={taskIdsWithComments.has(task.id)}
          />
        ))}
      </tbody>
    </table>
  )
}
