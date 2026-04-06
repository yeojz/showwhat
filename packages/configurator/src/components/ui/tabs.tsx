import type React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/utils/cn";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={className} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:justify-start data-[orientation=vertical]:gap-0 data-[orientation=vertical]:rounded-none data-[orientation=vertical]:bg-transparent data-[orientation=vertical]:p-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-none data-[orientation=vertical]:border-l-2 data-[orientation=vertical]:border-l-transparent data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2.5 data-[orientation=vertical]:text-sm data-[orientation=vertical]:font-normal data-[orientation=vertical]:text-muted-foreground data-[orientation=vertical]:shadow-none data-[orientation=vertical]:hover:bg-muted data-[orientation=vertical]:data-[selected]:border-l-primary data-[orientation=vertical]:data-[selected]:bg-accent data-[orientation=vertical]:data-[selected]:font-medium data-[orientation=vertical]:data-[selected]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn(
        "flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTab, TabsPanel };
