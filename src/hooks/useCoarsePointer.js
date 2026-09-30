import { useEffect, useState } from 'react'

// True when the primary pointer is touch rather than a mouse or trackpad.
// Touch devices get a smaller drag handle, so dragging doesn't fight with
// scrolling.
export function useCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const handleChange = (e) => setIsCoarse(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isCoarse
}
