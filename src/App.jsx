import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  clearStoredToken,
  closeTask,
  fetchActiveTasks,
  fetchCurrentUser,
  fetchProjects,
  fetchSections,
  getStoredToken,
  storeToken,
} from './api/todoist'
import { DEFAULT_WEIGHTS, rankTasks } from './lib/scoring'
import { DEFAULT_ASSIGNMENT_MODE, passesAssignmentFilter } from './lib/assignment'
import TokenGate from './components/TokenGate'
import SettingsPanel from './components/SettingsPanel'
import TaskTable from './components/TaskTable'
import UpNext, { EMPTY_DROPPABLE_ID } from './components/UpNext'

const UP_NEXT_KEY = 'topdoist:upnext'
const ASSIGNMENT_MODE_KEY = 'topdoist:assignmentMode'
const PROJECT_FILTER_KEY = 'topdoist:selectedProjectIds'

function loadUpNextIds() {
  try {
    return JSON.parse(localStorage.getItem(UP_NEXT_KEY)) ?? []
  } catch {
    return []
  }
}

function saveUpNextIds(ids) {
  try {
    localStorage.setItem(UP_NEXT_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures
  }
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

export default function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [sections, setSections] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [selectedProjectIds, setSelectedProjectIds] = useState(loadSelectedProjectIds)
  const [assignmentMode, setAssignmentMode] = useState(loadAssignmentMode)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upNextIds, setUpNextIds] = useState(loadUpNextIds)
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

  useEffect(() => saveUpNextIds(upNextIds), [upNextIds])
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

  async function loadFromTodoist(activeToken) {
    setLoading(true)
    setError('')
    try {
      const [taskData, projectData, sectionData, user] = await Promise.all([
        fetchActiveTasks(activeToken),
        fetchProjects(activeToken),
        fetchSections(activeToken),
        fetchCurrentUser(activeToken),
      ])
      setTasks(taskData)
      setProjects(projectData)
      setSections(sectionData)
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

  // Tasks the user has manually dragged into Up Next, in the order they put
  // them, dropping any ids for tasks that no longer exist (completed/deleted).
  const upNextTasks = useMemo(
    () => upNextIds.map((id) => tasksById[id]).filter(Boolean),
    [upNextIds, tasksById],
  )

  const filteredTasks = useMemo(() => {
    const upNextSet = new Set(upNextIds)
    return tasks.filter((t) => {
      if (upNextSet.has(t.id)) return false
      if (selectedProjectIds !== null && !selectedProjectIds.includes(t.project_id)) return false
      if (!passesAssignmentFilter(t, { mode: assignmentMode, project: projectsById[t.project_id], currentUserId })) {
        return false
      }
      return true
    })
  }, [tasks, selectedProjectIds, upNextIds, assignmentMode, projectsById, currentUserId])

  const ranked = useMemo(() => rankTasks(filteredTasks, { weights }), [filteredTasks, weights])

  function handleUpNextInsert(taskId, targetIndex) {
    setUpNextIds((prev) => {
      const withoutTask = prev.filter((id) => id !== taskId)
      const insertAt = Math.min(targetIndex, withoutTask.length)
      return [...withoutTask.slice(0, insertAt), taskId, ...withoutTask.slice(insertAt)]
    })
  }

  function handleUpNextRemove(taskId) {
    setUpNextIds((prev) => prev.filter((id) => id !== taskId))
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
    const isDroppingOnUpNext = overId === EMPTY_DROPPABLE_ID || upNextIds.includes(overId)
    if (!isDroppingOnUpNext) return // only dropping into/within Up Next does anything

    const isFromUpNext = upNextIds.includes(activeId)
    if (isFromUpNext) {
      // Reordering within Up Next.
      if (overId !== activeId && upNextIds.includes(overId)) {
        setUpNextIds((prev) => arrayMove(prev, prev.indexOf(activeId), prev.indexOf(overId)))
      }
    } else {
      // Pulled in from the ranked list.
      const targetIndex = upNextIds.includes(overId) ? upNextIds.indexOf(overId) : upNextIds.length
      handleUpNextInsert(activeId, targetIndex)
    }
  }

  async function handleComplete(taskId) {
    setCompletingIds((prev) => new Set(prev).add(taskId))
    try {
      await closeTask(token, taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setUpNextIds((prev) => prev.filter((id) => id !== taskId))
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

  function handleSignOut() {
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
    setSections([])
    setCurrentUserId(null)
    setUpNextIds([])
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
          onRemove={handleUpNextRemove}
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
      />
    </div>
  )
}
