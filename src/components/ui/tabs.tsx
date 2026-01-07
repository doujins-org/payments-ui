import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-transparent border border-white/30 text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Force active state styling with !important to override any conflicting styles
  React.useEffect(() => {
    const element = triggerRef.current
    if (!element) return

    const updateStyles = () => {
      const isActive = element.getAttribute('data-state') === 'active'
      if (isActive) {
        element.style.setProperty('background-color', 'rgba(255, 255, 255, 0.3)', 'important')
        element.style.setProperty('border-color', 'transparent', 'important')
      } else {
        element.style.removeProperty('background-color')
        element.style.removeProperty('border-color')
      }
    }

    // Initial update
    updateStyles()

    // Watch for attribute changes
    const observer = new MutationObserver(updateStyles)
    observer.observe(element, { attributes: true, attributeFilter: ['data-state'] })

    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={triggerRef}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/70 inline-flex h-[calc(100%-0.5rem)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color,border-color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
