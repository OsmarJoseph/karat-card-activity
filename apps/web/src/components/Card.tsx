import type { ReactNode } from 'react'

/** The one panel shape every section sits in, so spacing and borders are decided once. */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {title && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
