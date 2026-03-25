import type React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/utils/cn";

function Tabs({ ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
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

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-none data-[orientation=vertical]:border-l-2 data-[orientation=vertical]:border-l-transparent data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2.5 data-[orientation=vertical]:text-sm data-[orientation=vertical]:font-normal data-[orientation=vertical]:text-muted-foreground data-[orientation=vertical]:shadow-none data-[orientation=vertical]:hover:bg-muted data-[orientation=vertical]:data-[state=active]:border-l-primary data-[orientation=vertical]:data-[state=active]:bg-accent data-[orientation=vertical]:data-[state=active]:font-medium data-[orientation=vertical]:data-[state=active]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
