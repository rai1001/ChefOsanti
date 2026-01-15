import type { ReactNode } from 'react'

type SkeletonProps = {
  className?: string
  children?: ReactNode
}

export function Skeleton({ className = 'h-4 w-full', children }: SkeletonProps) {
  if (children) {
    return (
      <div className={`animate-pulse rounded-md bg-surface2/70 ${className}`}>
        {children}
      </div>
    )
  }
  return <div className={`animate-pulse rounded-md bg-surface2/70 ${className}`} />
}
