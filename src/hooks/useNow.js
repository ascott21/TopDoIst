import { useEffect, useState } from 'react'

// The current time, refreshed every `intervalMs`, so scores and relative
// due dates move on even when no new data arrives.
export function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
