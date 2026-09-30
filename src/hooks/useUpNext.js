import { useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { UP_NEXT_LABEL, hasUpNextLabel, withLabelAdded, withLabelRemoved } from '../lib/upNextLabel'
import { isProjectSelected } from '../lib/projectFilter'
import { rankTasks } from '../lib/scoring'
import { usePersistentState } from './usePersistentState'

const UP_NEXT_ORDER_KEY = 'topdoist:upnext'

// Which tasks are in Up Next is decided by the Todoist label, so it syncs
// across devices. Todoist can't store an order within a label, so the order
// is a list of task ids kept in this browser.
export function useUpNext({ tasks, selectedProjectIds, rankOptions, updateLabels }) {
  const [order, setOrder] = usePersistentState(UP_NEXT_ORDER_KEY, [])

  // Tasks with a saved position come first, in that order. Labeled tasks
  // without one (say, labeled on another device) follow, highest score
  // first. The project filter applies here too.
  const upNextTasks = useMemo(() => {
    const labeled = tasks.filter((t) => hasUpNextLabel(t) && isProjectSelected(selectedProjectIds, t.project_id))
    const labeledById = new Map(labeled.map((t) => [t.id, t]))
    const positioned = order.filter((id) => labeledById.has(id)).map((id) => labeledById.get(id))
    const positionedIds = new Set(positioned.map((t) => t.id))
    const unpositioned = rankTasks(
      labeled.filter((t) => !positionedIds.has(t.id)),
      rankOptions,
    ).map((r) => r.task)
    return [...positioned, ...unpositioned]
  }, [tasks, selectedProjectIds, order, rankOptions])

  // `overId` is the Up Next item the task was dropped on, or anything else
  // (the section itself) to drop it at the end. A task from the ranked list
  // gets the Up Next label, which is a real write; a task already in Up Next
  // just moves, locally. Either way the saved order becomes the order now on
  // screen, which also gives a position to any task that didn't have one.
  function drop(taskId, overId) {
    const displayedIds = upNextTasks.map((t) => t.id)
    const overIndex = displayedIds.indexOf(overId)
    const fromIndex = displayedIds.indexOf(taskId)

    if (fromIndex !== -1) {
      if (overIndex !== -1 && overIndex !== fromIndex) setOrder(arrayMove(displayedIds, fromIndex, overIndex))
      return
    }

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const insertAt = overIndex === -1 ? displayedIds.length : overIndex
    setOrder([...displayedIds.slice(0, insertAt), taskId, ...displayedIds.slice(insertAt)])
    updateLabels(taskId, withLabelAdded(task.labels, UP_NEXT_LABEL), "Couldn't add that task to Up Next. Try again.")
  }

  function remove(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    forget(taskId)
    updateLabels(taskId, withLabelRemoved(task.labels, UP_NEXT_LABEL), "Couldn't remove that task from Up Next. Try again.")
  }

  // Drops a task's saved position, e.g. once it's completed.
  function forget(taskId) {
    setOrder((prev) => prev.filter((id) => id !== taskId))
  }

  return { upNextTasks, drop, remove, forget }
}
