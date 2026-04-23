"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

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
RadioGroup.displayName = RadioGroupPrimitive.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioPrimitive>,
  React.ComponentPropsWithoutRef<typeof RadioPrimitive>
>(({ className, ...props }, ref) => {
  return (
    <RadioPrimitive
      ref={ref}
      className={cn(
        "aspect-square size-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <div className="size-2 rounded-full bg-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive>
  )
})
RadioGroupItem.displayName = RadioPrimitive.displayName

const Radio = RadioGroupItem

export { RadioGroup, RadioGroupItem, Radio }
