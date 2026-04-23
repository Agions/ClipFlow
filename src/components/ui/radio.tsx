"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive
      ref={ref}
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
})

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      className={cn(
        "aspect-square size-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-checked:bg-primary aria-checked:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
})

export { RadioGroup, RadioGroupItem }
