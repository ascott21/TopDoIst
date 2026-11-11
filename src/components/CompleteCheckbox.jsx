// Sits inside a draggable row/item. dnd-kit's activation constraint (a
// brief hold before a drag starts) means a plain tap still reaches
// onComplete, while a press-and-hold here picks the task up like anywhere
// else on the row.
export default function CompleteCheckbox({ checked, onComplete }) {
  return (
    <button
      type="button"
      className={`complete-checkbox${checked ? ' is-checked' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!checked) onComplete()
      }}
      disabled={checked}
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? 'Completing…' : 'Mark task complete'}
    >
      {checked && (
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
          <path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
