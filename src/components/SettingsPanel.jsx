import { useEffect } from 'react'
import WeightControls from './WeightControls'
import ProjectFilter from './ProjectFilter'
import LabelBonusSettings from './LabelBonusSettings'
import { ASSIGNMENT_MODE_OPTIONS } from '../lib/assignment'

export default function SettingsPanel({
  open,
  onClose,
  assignmentMode,
  onAssignmentModeChange,
  projects,
  selectedProjectIds,
  onSelectedProjectIdsChange,
  weights,
  onWeightsChange,
  labelBonuses,
  availableLabels,
  onLabelBonusesChange,
  openInDesktopApp,
  onOpenInDesktopAppChange,
}) {
  // Close on Escape.
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
          <ProjectFilter projects={projects} selectedIds={selectedProjectIds} onChange={onSelectedProjectIdsChange} />
        </section>

        <section className="settings-section">
          <WeightControls weights={weights} onChange={onWeightsChange} />
        </section>

        <section className="settings-section">
          <LabelBonusSettings
            labelBonuses={labelBonuses}
            availableLabels={availableLabels}
            onChange={onLabelBonusesChange}
          />
        </section>

        <section className="settings-section">
          <h3>Links</h3>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={openInDesktopApp}
              onChange={(e) => onOpenInDesktopAppChange(e.target.checked)}
            />
            Open tasks in the Todoist desktop app
          </label>
          <span className="weight-hint">
            Uses Todoist's todoist:// links instead of the website. Only turn this on if the
            Todoist desktop app is installed on this device — otherwise clicking a task will do
            nothing. This is a per-device setting, not synced anywhere.
          </span>
        </section>
      </aside>
    </div>
  )
}
