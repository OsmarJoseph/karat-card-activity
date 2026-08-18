import { useEffect, useRef, useState } from 'react'

/**
 * The width of the element the returned ref is attached to, kept current as the layout
 * changes. Charts need a pixel width, and reading it here rather than from a wrapper
 * component keeps the rendered DOM exactly what this file writes.
 */
export function useElementWidth(): [ref: React.RefObject<HTMLDivElement | null>, width: number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(element)
    // Measured once directly, so the first paint does not wait for the observer.
    setWidth(element.getBoundingClientRect().width)

    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
