// Types
export * from "./types.js";

// Utils
export { cn } from "./utils/cn.js";
export { stripAutoIds, isAutoId, AUTO_ID_PREFIX } from "./utils/id.js";
export {
  BUILTIN_CONDITION_TYPES,
  CONDITION_TYPE_MAP,
  getConditionMeta,
} from "./components/condition-builder/condition-registry.js";
export type { ConditionTypeMeta } from "./components/condition-builder/condition-registry.js";

// UI primitives
export { Button, buttonVariants } from "./components/ui/button.js";
export { Input } from "./components/ui/input.js";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select.js";
export { Badge, badgeVariants } from "./components/ui/badge.js";
export { Separator } from "./components/ui/separator.js";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area.js";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "./components/ui/dialog.js";
export { Menu, MenuContent, MenuItem, MenuTrigger, MenuSeparator } from "./components/ui/menu.js";
export { Label } from "./components/ui/label.js";
export { Switch } from "./components/ui/switch.js";
export { Textarea } from "./components/ui/textarea.js";
export { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover.js";
export { Tabs, TabsList, TabsTab, TabsPanel } from "./components/ui/tabs.js";

// Common components
export { ValueInput } from "./components/common/ValueInput.js";
export { DateTimeInput } from "./components/common/DateTimeInput.js";
export { ValidationMessage } from "./components/common/ValidationMessage.js";
export { ThemeToggle } from "./components/common/ThemeToggle.js";
export { ErrorBoundary } from "./components/common/ErrorBoundary.js";
export { ConfirmDialog } from "./components/common/ConfirmDialog.js";

// Condition Builder
export { ConditionBuilder } from "./components/condition-builder/ConditionBuilder.js";

// Variation Editor
export { VariationCard } from "./components/variation-editor/VariationCard.js";
export { VariationList } from "./components/variation-editor/VariationList.js";

// Definition Editor
export { DefinitionEditor } from "./components/definition-editor/DefinitionEditor.js";

// Definition List
export { DefinitionList } from "./components/definition-list/DefinitionList.js";

// Preset UI
export {
  createPresetUI,
  createPresetConditionMeta,
} from "./components/condition-builder/preset-ui.js";
export type { ConditionExtensions } from "./components/condition-builder/ConditionExtensionsContext.js";

// Configurator
export { Configurator } from "./configurator/Configurator.js";
export {
  StoreSourceContext,
  ActionStateContext,
  useConfiguratorStore,
  useActionState,
  useStoreRef,
} from "./configurator/context.js";
export type { ActionStateContextValue } from "./configurator/context.js";
export { useConfiguratorSelector } from "./configurator/useConfiguratorSelector.js";
export type {
  ConfiguratorStore,
  ConfiguratorStoreSource,
  ValidationIssue,
  ActionState,
} from "./configurator/types.js";
export type { PreviewResult } from "./configurator/preview-store.js";
export { PreviewStateProvider } from "./configurator/preview-context.js";
export type { PreviewState } from "./configurator/preview-context.js";
