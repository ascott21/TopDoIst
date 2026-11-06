const SLIDERS = [
  { key: 'priority', label: 'Priority', hint: "weight on Todoist's P1-P4 flag" },
  { key: 'due', label: 'Due date urgency', hint: 'weight on overdue / due-soon' },
  { key: 'staleness', label: 'Staleness', hint: 'weight on how long a task has sat idle' },
  {
    key: 'duration',
    label: 'Duration',
    hint: 'positive pushes long tasks up, negative pushes them down (short tasks first)',
    min: -3,
  },
]

export default function WeightControls({ weights, onChange, onReset, defaultDurationMinutes, onDefaultDurationChange }) {
  return (
    <div className="weight-controls">
      <div className="weight-controls-header">
        <h2>Weights</h2>
        <button type="button" className="link-button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
      {SLIDERS.map(({ key, label, hint, min = 0, max = 3 }) => (
        <label key={key} className="weight-slider">
          <div className="weight-slider-label">
            <span>{label}</span>
            <span className="weight-value">{weights[key].toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step="0.1"
            value={weights[key]}
            onChange={(e) => onChange({ ...weights, [key]: parseFloat(e.target.value) })}
          />
          <span className="weight-hint">{hint}</span>
        </label>
      ))}
      <label className="default-duration">
        <span>Default duration</span>
        <input
          type="number"
          min="0"
          step="5"
          placeholder="none"
          value={defaultDurationMinutes ?? ''}
          onChange={(e) => {
            const minutes = parseFloat(e.target.value)
            onDefaultDurationChange(Number.isFinite(minutes) && minutes > 0 ? minutes : null)
          }}
          aria-label="Default duration in minutes"
        />
        <span>min</span>
      </label>
      <span className="weight-hint">
        Assumed for tasks with no duration set in Todoist, for the Duration weight and the Up Next
        total. Leave blank for none — those tasks then score nothing on duration.
      </span>
    </div>
  )
}
