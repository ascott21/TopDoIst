import { useDraggable } from '@dnd-kit/core'
import PriorityDot from './PriorityDot'
import CompleteCheckbox from './CompleteCheckbox'
import TaskIndicators from './TaskIndicators'
import TaskLink from './TaskLink'
import { formatProjectMeta, formatDue, isOverdue } from '../lib/taskDisplay'

function TaskRow({
  task,
  breakdown,
  projectsById,
  sectionsById,
  isCompleting,
  onComplete,
  hasComments,
  openInDesktopApp,
  isCoarsePointer,
}) {
  // Draggable but not sortable: this list's order comes from the scores, so
  // a row can only be dragged out to Up Next.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
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
      className={`${isDragging ? 'is-dragging' : ''} ${isCoarsePointer ? '' : 'row-draggable'}`}
      title={title}
      // On a mouse, the whole row starts a drag (a quick click still reaches
      // the link and checkbox). On touch, only the checkbox does, so a scroll
      // that starts on the row isn't taken for a drag.
      {...(isCoarsePointer ? {} : dragProps)}
    >
      <td className="col-check">
        <CompleteCheckbox
          checked={isCompleting}
          onComplete={() => onComplete(task.id)}
          dragProps={isCoarsePointer ? dragProps : {}}
        />
      </td>
      <td className="col-task">
        <TaskLink task={task} openInDesktopApp={openInDesktopApp} />
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

export default function TaskTable({
  ranked,
  projectsById,
  sectionsById,
  completingIds,
  onComplete,
  taskIdsWithComments,
  emptyMessage,
  openInDesktopApp,
  isCoarsePointer,
}) {
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
            openInDesktopApp={openInDesktopApp}
            isCoarsePointer={isCoarsePointer}
          />
        ))}
      </tbody>
    </table>
  )
}
