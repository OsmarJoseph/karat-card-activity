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
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      {title && (
        <header className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
