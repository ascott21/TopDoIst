import { useEffect } from 'react'
import WeightControls from './WeightControls'
import ProjectFilter from './ProjectFilter'
import { ASSIGNMENT_MODE_OPTIONS } from '../lib/assignment'

export default function SettingsPanel({
  open,
  onClose,
  weights,
  onWeightsChange,
  onResetWeights,
  projects,
  isProjectSelected,
  onToggleProject,
  onToggleAllProjects,
  assignmentMode,
  onAssignmentModeChange,
}) {
  // Close on Escape, for anyone who doesn't want to reach for the mouse.
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <aside className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <section className="settings-section">
          <h3>Shared project tasks</h3>
          {ASSIGNMENT_MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="radio-option">
              <input
                type="radio"
                name="assignment-mode"
                value={opt.value}
                checked={assignmentMode === opt.value}
                onChange={() => onAssignmentModeChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </section>

        <section className="settings-section">
          <h3>Project</h3>
          <ProjectFilter
            projects={projects}
            isSelected={isProjectSelected}
            onToggleProject={onToggleProject}
            onToggleAll={onToggleAllProjects}
          />
        </section>

        <section className="settings-section">
          <WeightControls weights={weights} onChange={onWeightsChange} onReset={onResetWeights} />
        </section>
      </aside>
    </div>
  )
}
