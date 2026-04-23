import * as React from "react"
import { cn } from "@/lib/utils"

interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  current?: number
}

const Steps: React.FC<StepsProps> = ({ className, current = 0, children, ...props }) => {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ active?: boolean; completed?: boolean }>, {
            active: index === current,
            completed: index < current,
          })
        }
        return child
      })}
    </div>
  )
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  active?: boolean
  completed?: boolean
}

const Step: React.FC<StepProps> = ({ className, title, active, completed, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1",
        active && "text-primary",
        completed && "text-primary",
        !active && !completed && "text-muted-foreground",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2",
          active && "border-primary bg-primary text-primary-foreground",
          completed && "border-primary bg-primary text-primary-foreground",
          !active && !completed && "border-muted bg-transparent"
        )}
      >
        {completed ? '✓' : active ? '●' : '○'}
      </div>
      {title && <span className="text-xs">{title}</span>}
    </div>
  )
}

export { Steps, Step }
