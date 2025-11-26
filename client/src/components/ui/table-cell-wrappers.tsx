import * as React from "react"

interface TableCellInteractiveProps {
  children: React.ReactNode
  className?: string
}

export function TableCellInteractive({ children, className }: TableCellInteractiveProps) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      className={className}
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  )
}
