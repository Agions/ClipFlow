import * as React from "react"
import { cn } from "@/lib/utils"

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 1 | 2 | 3 | 4 | 6 | 8
}

const Grid: React.FC<GridProps> = ({ className, cols = 3, gap = 4, ...props }) => {
  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  }
  const gapClasses: Record<number, string> = {
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  }
  return (
    <div className={cn("grid", colClasses[cols], gapClasses[gap], className)} {...props} />
  )
}

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gutter?: [number, number]
}

const Row: React.FC<RowProps> = ({ className, align = 'start', justify = 'start', gutter, ...props }) => {
  const alignClasses: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  }
  const justifyClasses: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }
  const gutterStyle = gutter ? { marginLeft: `-${gutter[0]}px`, marginRight: `-${gutter[0]}px`, marginTop: `-${gutter[1]}px`, marginBottom: `-${gutter[1]}px` } : {}
  const childrenStyle = gutter ? { paddingLeft: `${gutter[0]}px`, paddingRight: `${gutter[0]}px`, paddingTop: `${gutter[1]}px`, paddingBottom: `${gutter[1]}px` } : {}
  
  return (
    <div 
      className={cn("flex flex-wrap", alignClasses[align], justifyClasses[justify], className)} 
      style={gutterStyle}
      {...props} 
    />
  )
}

interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 6 | 12 | 'full'
}

const Col: React.FC<ColProps> = ({ className, span = 1, ...props }) => {
  const spanClasses: Record<string, string> = {
    1: 'flex-1',
    2: 'w-1/2',
    3: 'w-1/3',
    4: 'w-1/4',
    6: 'w-1/6',
    12: 'w-full',
    'full': 'w-full',
  }
  return (
    <div className={cn(spanClasses[String(span)], className)} {...props} />
  )
}

export { Grid, Col, Row }
