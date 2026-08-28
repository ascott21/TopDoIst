const SLIDERS = [
  { key: 'priority', label: 'Priority', hint: "weight on Todoist's P1-P4 flag" },
  { key: 'due', label: 'Due date urgency', hint: 'weight on overdue / due-soon' },
  { key: 'staleness', label: 'Staleness', hint: 'weight on how long a task has sat idle' },
]

export default function WeightControls({ weights, onChange, onReset }) {
  return (
    <div className="weight-controls">
      <div className="weight-controls-header">
        <h2>Weights</h2>
        <button type="button" className="link-button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
      {SLIDERS.map(({ key, label, hint }) => (
        <label key={key} className="weight-slider">
          <div className="weight-slider-label">
            <span>{label}</span>
            <span className="weight-value">{weights[key].toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={weights[key]}
            onChange={(e) => onChange({ ...weights, [key]: parseFloat(e.target.value) })}
          />
          <span className="weight-hint">{hint}</span>
        </label>
      ))}
    </div>
  )
}
