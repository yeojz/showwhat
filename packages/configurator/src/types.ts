import type { Condition, Definition, Definitions, Variation } from "showwhat";

// ── DefinitionList ─────────────────────────────────────────────────────────

export type DefinitionListProps = {
  keys: string[];
  definitions: Definitions;
  selectedKey: string | null;
  validationErrors?: Record<string, unknown[]>;
  dirtyKeys?: string[];
  onSelect: (key: string) => void;
  onAdd: (key: string) => void | Promise<void>;
  onRemove: (key: string) => void;
};

export type DefinitionListItemProps = {
  definitionKey: string;
  variationCount?: number;
  isActive?: boolean;
  hasErrors: boolean;
  isSelected: boolean;
  isDirty?: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

// ── DefinitionEditor ───────────────────────────────────────────────────────

export type DefinitionEditorProps = {
  definitionKey: string;
  definition: Definition;
  validationErrors?: ValidationIssueDisplay[];
  isDirty?: boolean;
  isPending?: boolean;
  onUpdate: (definition: Definition) => void;
  onRename: (newKey: string) => void | Promise<void>;
  onSave?: () => void;
  onDiscard?: () => void;
  onRemove?: () => void;
  onExport?: (format: "yaml" | "json") => void;
  onRefresh?: () => void;
};

// ── VariationEditor ─────────────────────────────────────────────────────────

export type VariationListProps = {
  variations: Variation[];
  validationErrors?: ValidationIssueDisplay[];
  onChange: (variations: Variation[]) => void;
};

export type VariationCardProps = {
  variation: Variation;
  index: number;
  validationErrors?: ValidationIssueDisplay[];
  onChange: (variation: Variation) => void;
  onRemove: () => void;
  dragHandleProps?: Record<string, unknown>;
};

// ── ConditionBuilder ────────────────────────────────────────────────────────

export type ConditionBuilderProps = {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  validationErrors?: ValidationIssueDisplay[];
};

export type ConditionBlockProps = {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  depth?: number;
  errors?: ValidationIssueDisplay[];
};

export type ConditionGroupProps = {
  type: "and" | "or" | "checkAnnotations";
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  depth?: number;
  errors?: ValidationIssueDisplay[];
};

export type ConditionValueEditorProps = {
  condition: Condition;
  onChange: (condition: Condition) => void;
};

// ── Common ──────────────────────────────────────────────────────────────────

export type ValueInputProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
};

export type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export type ValidationIssueDisplay = {
  path: (string | number)[];
  message: string;
};

export type ValidationMessageProps = {
  errors?: ValidationIssueDisplay[];
};

export type ThemeToggleProps = {
  theme: "light" | "dark" | "system";
  onToggle: (theme: "light" | "dark" | "system") => void;
};
