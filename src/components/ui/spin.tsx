import * as React from "react"
import { cn } from "@/lib/utils"

interface SpinProps extends React.HTMLAttributes<HTMLDivElement> {
  spinning?: boolean
  tip?: string
  size?: 'small' | 'default' | 'large'
}

const Spin: React.FC<SpinProps> = ({ spinning = true, tip, size = 'default', className, children, ...props }) => {
  if (!spinning) return children ? <>{children}</> : null
  
  const sizeMap = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  }
  
  return (
    <div className={cn("flex flex-col items-center gap-2", className)} {...props}>
      <div className={cn("animate-spin border-2 border-primary border-t-transparent rounded-full", sizeMap[size])} />
      {tip && <span className="text-sm text-muted-foreground">{tip}</span>}
    </div>
  )
}

export { Spin }