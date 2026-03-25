import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionValueEditor } from "./ConditionValueEditor.js";

describe("ConditionValueEditor", () => {
  it("renders string-array values as chips", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod", "staging"] }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("prod")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
  });

  it("resyncs string-array chips when parent props change", () => {
    const { rerender } = render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod", "staging"] }}
        onChange={vi.fn()}
      />,
    );

    rerender(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["preview"] }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("preview")).toBeInTheDocument();
    expect(screen.queryByText("prod")).not.toBeInTheDocument();
    expect(screen.queryByText("staging")).not.toBeInTheDocument();
  });

  it("adds a chip when Enter is pressed", async () => {
    const onChange = vi.fn();
    render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod"] }}
        onChange={onChange}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const input = inputs.find((el) => !el.hasAttribute("disabled"))!;
    await userEvent.type(input, "staging{Enter}");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "env", value: ["prod", "staging"] }),
    );
  });

  it("removes last chip on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod", "staging"] }}
        onChange={onChange}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const input = inputs.find((el) => !el.hasAttribute("disabled"))!;
    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "env", value: "prod" }));
  });

  it("removes a chip when \u00d7 button is clicked", async () => {
    const onChange = vi.fn();
    render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod", "staging"] }}
        onChange={onChange}
      />,
    );

    const removeBtn = screen.getByLabelText("Remove prod");
    await userEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "env", value: "staging" }),
    );
  });

  it("does not add duplicate values", async () => {
    const onChange = vi.fn();
    render(
      <ConditionValueEditor
        condition={{ type: "env", op: "eq", value: ["prod"] }}
        onChange={onChange}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    const input = inputs.find((el) => !el.hasAttribute("disabled"))!;
    await userEvent.type(input, "prod{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("resyncs custom condition textarea when parent props change", () => {
    const { rerender } = render(
      <ConditionValueEditor
        condition={{ type: "customThing", value: "alpha" } as never}
        onChange={vi.fn()}
      />,
    );

    rerender(
      <ConditionValueEditor
        condition={{ type: "customThing", value: "beta" } as never}
        onChange={vi.fn()}
      />,
    );

    // Args textarea shows JSON with the value field
    const textarea = screen.getByPlaceholderText(/region/);
    expect(textarea).toHaveValue(JSON.stringify({ value: "beta" }, null, 2));
  });

  it("hides the id field from the custom condition metadata textarea", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "customThing", id: "abc-123", region: "us-east" } as never}
        onChange={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/region/) as HTMLTextAreaElement;
    expect(textarea.value).not.toContain("id");
    expect(textarea.value).toContain("region");
  });

  it("renders StringConditionEditor for type string", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "string", key: "userId", op: "eq", value: "abc" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("userId")).toBeInTheDocument();
  });

  it("renders NumberConditionEditor for type number", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "number", key: "score", op: "eq", value: 42 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("score")).toBeInTheDocument();
    expect(screen.getByDisplayValue("42")).toBeInTheDocument();
  });

  it("renders DatetimeConditionEditor for type datetime", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "datetime", key: "at", op: "eq", value: "2025-01-01T00:00:00Z" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("at")).toBeInTheDocument();
  });

  it("renders BoolConditionEditor for type bool", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "bool", key: "isAdmin", value: true } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("isAdmin")).toBeInTheDocument();
  });

  it("renders StartAtConditionEditor for type startAt", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "startAt", value: "2025-01-01T00:00:00Z" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("at")).toBeInTheDocument();
  });

  it("renders EndAtConditionEditor for type endAt", () => {
    render(
      <ConditionValueEditor
        condition={{ type: "endAt", value: "2025-12-31T23:59:59Z" } as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("at")).toBeInTheDocument();
  });
});
