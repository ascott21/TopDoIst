// Small, purely presence-based icons — no counts, just "there's more here
// worth a look." Description comes free with every task fetch; comments
// don't (see fetchCommentsForProject in api/todoist.js), so `hasComments`
// may lag behind `hasDescription` in freshness — see App.jsx.
export default function TaskIndicators({ hasDescription, hasComments }) {
  if (!hasDescription && !hasComments) return null

  return (
    <span className="task-indicators">
      {hasDescription && (
        <svg
          className="task-indicator-icon"
          viewBox="0 0 16 16"
          width="11"
          height="11"
          aria-label="Has a description"
          role="img"
        >
          <title>Has a description</title>
          <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="4.5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
      {hasComments && (
        <svg
          className="task-indicator-icon"
          viewBox="0 0 16 16"
          width="11"
          height="11"
          aria-label="Has comments"
          role="img"
        >
          <title>Has comments</title>
          <path
            d="M2 3.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H6l-3 2.8V11H3.5C2.67 11 2 10.33 2 9.5v-6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}
