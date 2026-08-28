// Todoist's own priority flag colors: p1 red, p2 orange, p3 blue, p4 (the
// default/no-priority level) gets an empty outline rather than a fill.
const PRIORITY_META = {
  4: { label: 'Priority 1', color: '#d1453b', filled: true },
  3: { label: 'Priority 2', color: '#eb8909', filled: true },
  2: { label: 'Priority 3', color: '#246fe0', filled: true },
  1: { label: 'Priority 4', color: '#9a9a9a', filled: false },
}

export default function PriorityDot({ priority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META[1]
  return (
    <span
      className="priority-dot"
      title={meta.label}
      aria-label={meta.label}
      style={{
        backgroundColor: meta.filled ? meta.color : 'transparent',
        borderColor: meta.color,
      }}
    />
  )
}
