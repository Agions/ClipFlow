"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  return <>{children}</>
}

interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  asChild?: boolean
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({ children, asChild, onClick, ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
  }
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    })
  }
  return <button {...props} onClick={handleClick}>{children}</button>
}

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ className, children, onClose, ...props }) => {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm",
        className
      )}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      {...props}
    >
      <div className="relative z-50 w-full max-w-lg rounded-lg bg-zinc-900 border border-zinc-800 p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}

const AlertDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />
)

const AlertDialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-zinc-50", className)} {...props} />
)

const AlertDialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("text-sm text-zinc-400 mb-4", className)} {...props} />
)

const AlertDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />
)

const AlertDialogAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
      className
    )}
    {...props}
  />
)

const AlertDialogCancel: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800",
      className
    )}
    {...props}
  />
)

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
}
