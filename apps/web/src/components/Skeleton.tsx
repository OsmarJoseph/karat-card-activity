/** Sized by the caller so a placeholder occupies its content's height and nothing shifts. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}
