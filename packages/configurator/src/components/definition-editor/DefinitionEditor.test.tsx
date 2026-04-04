import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefinitionEditor } from "./DefinitionEditor.js";
import type { Definition } from "showwhat";

function renderDefinitionEditorWithErrors() {
  const definition: Definition = {
    description: "Test definition",
    variations: [
      {
        value: true,
        description: "Enabled",
        conditions: [{ type: "env", op: "eq", value: "" }],
      },
      { value: false, description: "Disabled" },
    ],
  };
  const validationErrors = [
    { path: ["variations", 0, "conditions", 0, "value"], message: "Invalid input" },
  ];
  render(
    <DefinitionEditor
      definitionKey="err-def"
      definition={definition}
      validationErrors={validationErrors}
      onUpdate={vi.fn()}
      onRename={vi.fn()}
    />,
  );
  // Expand the first variation card to reveal condition errors
  const trigger = screen.getByText("Enabled");
  fireEvent.click(trigger);
}

describe("DefinitionEditor", () => {
  const testDefinition: Definition = {
    description: "Test definition",
    variations: [
      { value: true, description: "Enabled" },
      { value: false, description: "Disabled" },
    ],
  };

  it("should render the definition key", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByText("my-def")).toBeDefined();
  });

  it("should render the comment field", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Test definition")).toBeDefined();
  });

  it("should render variation cards", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("should call onUpdate when comment changes", () => {
    const onUpdate = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    const commentInput = screen.getByDisplayValue("Test definition");
    fireEvent.change(commentInput, { target: { value: "Updated comment" } });
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate.mock.calls[0][0].description).toBe("Updated comment");
  });

  it("should enable key editing on click", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("my-def"));
    const input = screen.getByDisplayValue("my-def");
    expect(input.tagName).toBe("INPUT");
  });

  it("should enable Save/Discard buttons when isDirty", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        isDirty={true}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByText("Save").closest("button")!.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Discard").closest("button")!.hasAttribute("disabled")).toBe(false);
  });

  it("should disable Save/Discard buttons when not dirty", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        isDirty={false}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByText("Save").closest("button")!.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Discard").closest("button")!.hasAttribute("disabled")).toBe(true);
  });

  it("shows nested validation details when the definition has errors", () => {
    renderDefinitionEditorWithErrors();
    expect(screen.getByText(/invalid condition/i)).toBeDefined();
  });

  it("should call onRename on blur after editing key", async () => {
    const onRename = vi.fn(async () => {});
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={onRename}
      />,
    );
    // Click to enter edit mode
    fireEvent.click(screen.getByText("my-def"));
    const input = screen.getByDisplayValue("my-def");
    fireEvent.change(input, { target: { value: "new-def" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(onRename).toHaveBeenCalledWith("new-def");
  });

  it("should handle Escape to cancel key editing", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("my-def"));
    const input = screen.getByDisplayValue("my-def");
    fireEvent.change(input, { target: { value: "changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    // Should revert to showing the key as a button
    expect(screen.getByText("my-def")).toBeDefined();
  });

  it("should handle Enter to submit key editing", async () => {
    const onRename = vi.fn(async () => {});
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={onRename}
      />,
    );
    fireEvent.click(screen.getByText("my-def"));
    const input = screen.getByDisplayValue("my-def");
    fireEvent.change(input, { target: { value: "new-def" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(onRename).toHaveBeenCalledWith("new-def");
  });

  it("should not rename if key is unchanged", () => {
    const onRename = vi.fn(async () => {});
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={onRename}
      />,
    );
    fireEvent.click(screen.getByText("my-def"));
    const input = screen.getByDisplayValue("my-def");
    fireEvent.blur(input);
    expect(onRename).not.toHaveBeenCalled();
  });

  it("should toggle active state", () => {
    const onUpdate = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    // The switch is labeled "Active"
    const activeSwitch = screen.getByRole("switch");
    fireEvent.click(activeSwitch);
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].active).toBe(false);
  });

  it("should set active to undefined when toggling an inactive definition on", () => {
    const onUpdate = vi.fn();
    const inactiveDef: Definition = {
      ...testDefinition,
      active: false,
    };
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={inactiveDef}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    const activeSwitch = screen.getByRole("switch");
    fireEvent.click(activeSwitch);
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].active).toBeUndefined();
  });

  it("should add a variation when Add button is clicked", () => {
    const onUpdate = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    // Find the Add button in the Variations section
    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].variations).toHaveLength(3);
  });

  it("should call onSave when Save button is clicked", () => {
    const onSave = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        isDirty={true}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("should render Discard as disabled when onDiscard is not provided", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        isDirty={true}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const discardBtn = screen.getByText("Discard").closest("button")!;
    expect(discardBtn.hasAttribute("disabled")).toBe(true);
  });

  it("should show the bottom Add variation button when there are more than 2 variations and it adds a variation when clicked", () => {
    const onUpdate = vi.fn();
    const threeVarDef: Definition = {
      description: "test",
      variations: [
        { value: "a", description: "First" },
        { value: "b", description: "Second" },
        { value: "c", description: "Third" },
      ],
    };
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={threeVarDef}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    const addVariationBtn = screen.getByText("Add variation");
    expect(addVariationBtn).toBeDefined();
    fireEvent.click(addVariationBtn);
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].variations).toHaveLength(4);
  });

  it("should clear comment when empty string is entered", () => {
    const onUpdate = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    const commentInput = screen.getByDisplayValue("Test definition");
    fireEvent.change(commentInput, { target: { value: "" } });
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].description).toBeUndefined();
  });

  it("should show validation error count banner", () => {
    const definition: Definition = {
      variations: [{ value: true }],
    };
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={definition}
        validationErrors={[
          { path: ["value"], message: "err1" },
          { path: ["other"], message: "err2" },
        ]}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 validation errors/)).toBeDefined();
  });

  it("should show singular validation error text for 1 error", () => {
    const definition: Definition = {
      variations: [{ value: true }],
    };
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={definition}
        validationErrors={[{ path: ["value"], message: "err" }]}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 validation error /)).toBeDefined();
  });

  it("should call onUpdate when a variation changes via VariationList", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    const defWithDesc: Definition = {
      description: "test",
      variations: [
        { value: "a", description: "First" },
        { value: "b", description: "Second" },
      ],
    };
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={defWithDesc}
        onUpdate={onUpdate}
        onRename={vi.fn()}
      />,
    );
    // Expand a variation card and modify the description
    const expandButton = screen.getAllByRole("button", { expanded: false })[0];
    await user.click(expandButton);
    const descInput = screen.getByDisplayValue("First");
    await user.clear(descInput);
    await user.type(descInput, "Updated");
    expect(onUpdate).toHaveBeenCalled();
    // The call should include variations in the update
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
    expect(lastCall.variations).toBeDefined();
  });

  it("updates keyDraft when definitionKey prop changes", () => {
    const { rerender } = render(
      <DefinitionEditor
        definitionKey="old-key"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    rerender(
      <DefinitionEditor
        definitionKey="new-key"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByText("new-key")).toBeDefined();
  });

  it("renders Export dropdown when onExport is provided", () => {
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    expect(screen.getByText("Export")).toBeDefined();
  });

  it("calls onExport with 'yaml' when Export as YAML is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onExport={onExport}
      />,
    );
    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as YAML"));
    expect(onExport).toHaveBeenCalledWith("yaml");
  });

  it("calls onExport with 'json' when Export as JSON is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <DefinitionEditor
        definitionKey="my-def"
        definition={testDefinition}
        onUpdate={vi.fn()}
        onRename={vi.fn()}
        onExport={onExport}
      />,
    );
    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as JSON"));
    expect(onExport).toHaveBeenCalledWith("json");
  });
});
