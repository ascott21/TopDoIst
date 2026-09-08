import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  clearStoredToken,
  closeTask,
  fetchActiveTasks,
  fetchCurrentUser,
  fetchLabels,
  fetchProjects,
  fetchSections,
  getStoredToken,
  storeToken,
  updateTaskLabels,
} from './api/todoist'
import { DEFAULT_WEIGHTS, DEFAULT_LABEL_BONUSES, rankTasks } from './lib/scoring'
import { DEFAULT_ASSIGNMENT_MODE, passesAssignmentFilter } from './lib/assignment'
import { UP_NEXT_LABEL, hasUpNextLabel, withLabelAdded, withLabelRemoved } from './lib/upNextLabel'
import TokenGate from './components/TokenGate'
import SettingsPanel from './components/SettingsPanel'
import TaskTable from './components/TaskTable'
import UpNext, { EMPTY_DROPPABLE_ID } from './components/UpNext'

// Same storage key as before this became label-based — it just changed
// role, from "the source of truth for Up Next" to "a local hint for the
// order of tasks that carry the Up Next label." No migration of the data
// itself is needed, only of what it means.
const UP_NEXT_ORDER_KEY = 'topdoist:upnext'
const ASSIGNMENT_MODE_KEY = 'topdoist:assignmentMode'
const PROJECT_FILTER_KEY = 'topdoist:selectedProjectIds'
const LABEL_BONUSES_KEY = 'topdoist:labelBonuses'

function loadUpNextOrder() {
  try {
    return JSON.parse(localStorage.getItem(UP_NEXT_ORDER_KEY)) ?? []
  } catch {
    return []
  }
}

function saveUpNextOrder(ids) {
  try {
    localStorage.setItem(UP_NEXT_ORDER_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures
  }
}

// One-time-per-load adoption: any task from the old local-only Up Next
// list that doesn't carry the Up Next label yet (i.e. from before this
// label-based approach existed) gets the label applied, so nothing
// already in progress appears to silently vanish. Safe to call on every
// load — once a task has the label there's nothing left to migrate for
// it, so this is a no-op after the first successful run.
async function migrateLegacyUpNext(activeToken, taskData) {
  const orderIds = loadUpNextOrder()
  if (orderIds.length === 0) return taskData

  const taskMap = new Map(taskData.map((t) => [t.id, t]))
  const toMigrate = orderIds.filter((id) => {
    const task = taskMap.get(id)
    return task && !hasUpNextLabel(task)
  })
  if (toMigrate.length === 0) return taskData

  const results = await Promise.allSettled(
    toMigrate.map((id) => {
      const newLabels = withLabelAdded(taskMap.get(id).labels, UP_NEXT_LABEL)
      return updateTaskLabels(activeToken, id, newLabels).then(() => id)
    }),
  )
  const migratedIds = new Set(results.filter((r) => r.status === 'fulfilled').map((r) => r.value))

  return taskData.map((t) => (migratedIds.has(t.id) ? { ...t, labels: withLabelAdded(t.labels, UP_NEXT_LABEL) } : t))
}

function loadAssignmentMode() {
  try {
    return localStorage.getItem(ASSIGNMENT_MODE_KEY) ?? DEFAULT_ASSIGNMENT_MODE
  } catch {
    return DEFAULT_ASSIGNMENT_MODE
  }
}

// `null` means "no filter" (every project selected) — the default, and what
// a fresh install starts with. Once the user unchecks anything, this holds
// the explicit list of project ids still selected.
function loadSelectedProjectIds() {
  try {
    const raw = localStorage.getItem(PROJECT_FILTER_KEY)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function loadLabelBonuses() {
  try {
    const raw = localStorage.getItem(LABEL_BONUSES_KEY)
    return raw == null ? DEFAULT_LABEL_BONUSES : JSON.parse(raw)
  } catch {
    return DEFAULT_LABEL_BONUSES
  }
}

export default function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [sections, setSections] = useState([])
  const [labels, setLabels] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [labelBonuses, setLabelBonuses] = useState(loadLabelBonuses)
  const [selectedProjectIds, setSelectedProjectIds] = useState(loadSelectedProjectIds)
  const [assignmentMode, setAssignmentMode] = useState(loadAssignmentMode)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upNextOrder, setUpNextOrder] = useState(loadUpNextOrder)
  const [activeDragId, setActiveDragId] = useState(null)
  // Tasks currently being marked complete: shown checked immediately, only
  // actually removed once Todoist confirms the close.
  const [completingIds, setCompletingIds] = useState(() => new Set())

  // A single PointerSensor handles mouse, touch, and pen uniformly (Pointer
  // Events unify all three). Using PointerSensor and TouchSensor together
  // is a known dnd-kit footgun — both fire for the same touch interaction
  // and race each other, so touch drags can misfire. A short hold before a
  // drag activates means a plain tap/click still reaches the checkbox's
  // onClick instead of starting a drag, and a touch scroll isn't hijacked.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 6 } }))

  useEffect(() => saveUpNextOrder(upNextOrder), [upNextOrder])
  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENT_MODE_KEY, assignmentMode)
    } catch {
      // ignore storage failures
    }
  }, [assignmentMode])
  useEffect(() => {
    try {
      if (selectedProjectIds === null) localStorage.removeItem(PROJECT_FILTER_KEY)
      else localStorage.setItem(PROJECT_FILTER_KEY, JSON.stringify(selectedProjectIds))
    } catch {
      // ignore storage failures
    }
  }, [selectedProjectIds])
  useEffect(() => {
    try {
      localStorage.setItem(LABEL_BONUSES_KEY, JSON.stringify(labelBonuses))
    } catch {
      // ignore storage failures
    }
  }, [labelBonuses])

  async function loadFromTodoist(activeToken) {
    setLoading(true)
    setError('')
    try {
      const [taskData, projectData, sectionData, labelData, user] = await Promise.all([
        fetchActiveTasks(activeToken),
        fetchProjects(activeToken),
        fetchSections(activeToken),
        fetchLabels(activeToken),
        fetchCurrentUser(activeToken),
      ])
      const migratedTaskData = await migrateLegacyUpNext(activeToken, taskData)
      setTasks(migratedTaskData)
      setProjects(projectData)
      setSections(sectionData)
      setLabels(labelData)
      setCurrentUserId(user?.id ?? null)
      storeToken(activeToken)
      setToken(activeToken)
    } catch (err) {
      setError(err.message || 'Something went wrong loading your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadFromTodoist(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const sectionsById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections])
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])

  // Membership (which tasks are in Up Next) comes from the Up Next label,
  // so it's the same on every device. Order is a local hint layered on top
  // — tasks with a saved position show in that order; anything labeled
  // from elsewhere that we have no saved position for is appended, most
  // urgent first, until it's dragged into a specific spot on this device.
  const labeledUpNextTasks = useMemo(() => tasks.filter(hasUpNextLabel), [tasks])

  const upNextTasks = useMemo(() => {
    const labeledIds = new Set(labeledUpNextTasks.map((t) => t.id))
    const ordered = upNextOrder.filter((id) => labeledIds.has(id)).map((id) => tasksById[id]).filter(Boolean)
    const orderedIds = new Set(ordered.map((t) => t.id))
    const unordered = rankTasks(
      labeledUpNextTasks.filter((t) => !orderedIds.has(t.id)),
      { weights, labelBonuses },
    ).map((r) => r.task)
    return [...ordered, ...unordered]
  }, [labeledUpNextTasks, upNextOrder, tasksById, weights, labelBonuses])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (hasUpNextLabel(t)) return false
      if (selectedProjectIds !== null && !selectedProjectIds.includes(t.project_id)) return false
      if (!passesAssignmentFilter(t, { mode: assignmentMode, project: projectsById[t.project_id], currentUserId })) {
        return false
      }
      return true
    })
  }, [tasks, selectedProjectIds, assignmentMode, projectsById, currentUserId])

  const ranked = useMemo(
    () => rankTasks(filteredTasks, { weights, labelBonuses }),
    [filteredTasks, weights, labelBonuses],
  )

  // Purely local — where a task sits within Up Next isn't something
  // Todoist's API can store, so reordering never touches the network.
  function reorderUpNextLocally(taskId, targetIndex) {
    setUpNextOrder((prev) => {
      const withoutTask = prev.filter((id) => id !== taskId)
      const insertAt = Math.min(targetIndex, withoutTask.length)
      return [...withoutTask.slice(0, insertAt), taskId, ...withoutTask.slice(insertAt)]
    })
  }

  // Pulling a task from the ranked list into Up Next is a real write: it
  // adds the Up Next label in Todoist (preserving whatever labels the task
  // already had) so it shows up in Up Next on every device, not just here.
  // Shown in place immediately; rolled back with an error if the save fails.
  async function handleAddToUpNext(taskId, targetIndex) {
    const task = tasksById[taskId]
    if (!task) return
    const previousLabels = task.labels
    const newLabels = withLabelAdded(task.labels, UP_NEXT_LABEL)

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, labels: newLabels } : t)))
    reorderUpNextLocally(taskId, targetIndex)

    try {
      await updateTaskLabels(token, taskId, newLabels)
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, labels: previousLabels } : t)))
      setError(err.message || "Couldn't add that task to Up Next. Try again.")
    }
  }

  // The Remove link: strips the Up Next label (also a real write), same
  // optimistic-then-rollback treatment.
  async function handleRemoveFromUpNext(taskId) {
    const task = tasksById[taskId]
    if (!task) return
    const previousLabels = task.labels
    const newLabels = withLabelRemoved(task.labels, UP_NEXT_LABEL)

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, labels: newLabels } : t)))
    setUpNextOrder((prev) => prev.filter((id) => id !== taskId))

    try {
      await updateTaskLabels(token, taskId, newLabels)
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, labels: previousLabels } : t)))
      setError(err.message || "Couldn't remove that task from Up Next. Try again.")
    }
  }

  function handleDragStart(event) {
    setActiveDragId(event.active.id)
  }

  function handleDragEnd(event) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id
    const displayedIds = upNextTasks.map((t) => t.id)
    const isInUpNext = (id) => displayedIds.includes(id)
    const isDroppingOnUpNext = overId === EMPTY_DROPPABLE_ID || isInUpNext(overId)
    if (!isDroppingOnUpNext) return // only dropping into/within Up Next does anything

    if (isInUpNext(activeId)) {
      // Reordering within Up Next — purely local, no API call. A task
      // showing here via its label alone (not yet in our saved order) may
      // not have an explicit position yet, so fold in the full currently
      // displayed sequence before swapping, rather than assuming both ids
      // are already in upNextOrder.
      if (overId !== activeId && isInUpNext(overId)) {
        setUpNextOrder((prev) => {
          const known = new Set(prev)
          const full = [...prev.filter((id) => isInUpNext(id)), ...displayedIds.filter((id) => !known.has(id))]
          return arrayMove(full, full.indexOf(activeId), full.indexOf(overId))
        })
      }
    } else {
      // Pulled in from the ranked list — this is a real label add.
      const targetIndex = isInUpNext(overId) ? displayedIds.indexOf(overId) : displayedIds.length
      handleAddToUpNext(activeId, targetIndex)
    }
  }

  async function handleComplete(taskId) {
    setCompletingIds((prev) => new Set(prev).add(taskId))
    try {
      await closeTask(token, taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setUpNextOrder((prev) => prev.filter((id) => id !== taskId))
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    } catch (err) {
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      setError(err.message || "Couldn't mark that task complete. Try again.")
    }
  }

  function isProjectSelected(projectId) {
    return selectedProjectIds === null || selectedProjectIds.includes(projectId)
  }

  function handleToggleProject(projectId) {
    setSelectedProjectIds((prev) => {
      const current = new Set(prev === null ? projects.map((p) => p.id) : prev)
      if (current.has(projectId)) current.delete(projectId)
      else current.add(projectId)
      return Array.from(current)
    })
  }

  function handleToggleAllProjects() {
    setSelectedProjectIds((prev) => {
      const allSelected = prev === null || prev.length === projects.length
      return allSelected ? [] : null
    })
  }

  function handleSetLabelBonus(label, points) {
    setLabelBonuses((prev) => ({ ...prev, [label]: points }))
  }

  function handleRemoveLabelBonus(label) {
    setLabelBonuses((prev) => {
      const next = { ...prev }
      delete next[label]
      return next
    })
  }

  function handleResetLabelBonuses() {
    setLabelBonuses(DEFAULT_LABEL_BONUSES)
  }

  function handleSignOut() {
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
    setSections([])
    setLabels([])
    setCurrentUserId(null)
    // upNextOrder is left as-is, same as the other local preferences
    // (weights, assignment mode, project filter, label bonuses) — it's
    // just an ordering hint keyed by task id, harmless to keep around.
  }

  if (!token) {
    return <TokenGate onSubmit={loadFromTodoist} error={error} loading={loading} />
  }

  const activeDragTask = activeDragId ? tasksById[activeDragId] : null

  return (
    <div className="app">
      <header className="app-header">
        <h1>TopDoist</h1>
        <div className="app-header-actions">
          <button type="button" onClick={() => loadFromTodoist(token)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            ⚙
          </button>
          <button type="button" className="link-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <UpNext
          tasks={upNextTasks}
          projectsById={projectsById}
          sectionsById={sectionsById}
          completingIds={completingIds}
          onComplete={handleComplete}
          onRemove={handleRemoveFromUpNext}
        />

        <main className="app-main">
          <TaskTable
            ranked={ranked}
            projectsById={projectsById}
            sectionsById={sectionsById}
            completingIds={completingIds}
            onComplete={handleComplete}
          />
        </main>

        <DragOverlay>{activeDragTask ? <div className="drag-overlay-card">{activeDragTask.content}</div> : null}</DragOverlay>
      </DndContext>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        weights={weights}
        onWeightsChange={setWeights}
        onResetWeights={() => setWeights(DEFAULT_WEIGHTS)}
        projects={projects}
        isProjectSelected={isProjectSelected}
        onToggleProject={handleToggleProject}
        onToggleAllProjects={handleToggleAllProjects}
        assignmentMode={assignmentMode}
        onAssignmentModeChange={setAssignmentMode}
        labelBonuses={labelBonuses}
        availableLabels={labels.map((l) => l.name)}
        onSetLabelBonus={handleSetLabelBonus}
        onRemoveLabelBonus={handleRemoveLabelBonus}
        onResetLabelBonuses={handleResetLabelBonuses}
      />
    </div>
  )
}
