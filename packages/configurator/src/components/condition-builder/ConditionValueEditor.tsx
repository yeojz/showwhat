import { StringConditionEditor } from "./StringConditionEditor.js";
import { NumberConditionEditor } from "./NumberConditionEditor.js";
import { DatetimeConditionEditor } from "./DatetimeConditionEditor.js";
import { BoolConditionEditor } from "./BoolConditionEditor.js";
import { EnvConditionEditor } from "./EnvConditionEditor.js";
import { StartAtConditionEditor } from "./StartAtConditionEditor.js";
import { EndAtConditionEditor } from "./EndAtConditionEditor.js";
import { CustomConditionEditor } from "./CustomConditionEditor.js";
import { useConditionExtensions } from "./ConditionExtensionsContext.js";
import type { ConditionValueEditorProps } from "../../types.js";

export function ConditionValueEditor({ condition, onChange }: ConditionValueEditorProps) {
  const extensions = useConditionExtensions();

  switch (condition.type) {
    case "string":
      return <StringConditionEditor condition={condition} onChange={onChange} />;
    case "number":
      return <NumberConditionEditor condition={condition} onChange={onChange} />;
    case "datetime":
      return <DatetimeConditionEditor condition={condition} onChange={onChange} />;
    case "bool":
      return <BoolConditionEditor condition={condition} onChange={onChange} />;
    case "env":
      return <EnvConditionEditor condition={condition} onChange={onChange} />;
    case "startAt":
      return <StartAtConditionEditor condition={condition} onChange={onChange} />;
    case "endAt":
      return <EndAtConditionEditor condition={condition} onChange={onChange} />;
    default: {
      // Looked up from the extension registry, not constructed here, so its identity is
      // stable across renders and state is not reset.
      const OverrideEditor = extensions?.editorOverrides.get(condition.type);
      if (OverrideEditor) {
        // oxlint-disable-next-line react/static-components
        return <OverrideEditor condition={condition} onChange={onChange} />;
      }
      const isPresetBacked =
        extensions?.extraConditionTypes.some((m) => m.type === condition.type) ?? false;
      return (
        <CustomConditionEditor
          condition={condition}
          onChange={onChange}
          isPresetBacked={isPresetBacked}
        />
      );
    }
  }
}
