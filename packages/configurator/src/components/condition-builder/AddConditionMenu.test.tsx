import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddConditionMenu } from "./AddConditionMenu.js";

describe("AddConditionMenu", () => {
  it("renders the Add condition trigger", () => {
    render(<AddConditionMenu onAdd={vi.fn()} />);
    expect(screen.getByText("Add condition")).toBeDefined();
  });

  it("opens dropdown and shows primitive condition types", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("string")).toBeDefined();
    expect(screen.getByText("number")).toBeDefined();
    expect(screen.getByText("datetime")).toBeDefined();
    expect(screen.getByText("bool")).toBeDefined();
  });

  it("opens dropdown and shows sugar condition types", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("env")).toBeDefined();
    expect(screen.getByText("startAt")).toBeDefined();
    expect(screen.getByText("endAt")).toBeDefined();
  });

  it("opens dropdown and shows group types, match annotations, and custom", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("and")).toBeDefined();
    expect(screen.getByText("or")).toBeDefined();
    expect(screen.getByText("matchAnnotations")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();
  });

  it("calls onAdd with 'and' when and is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("and"));
    expect(onAdd).toHaveBeenCalledWith("and");
  });

  it("calls onAdd with 'or' when or is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("or"));
    expect(onAdd).toHaveBeenCalledWith("or");
  });

  it("calls onAdd with 'matchAnnotations' when matchAnnotations is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("matchAnnotations"));
    expect(onAdd).toHaveBeenCalledWith("matchAnnotations");
  });

  it("calls onAdd with '__custom' when Custom is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("Custom"));
    expect(onAdd).toHaveBeenCalledWith("__custom");
  });

  it("calls onAdd with condition type when a primitive is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("string"));
    expect(onAdd).toHaveBeenCalledWith("string");
  });

  it("calls onAdd with 'env' when env is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("env"));
    expect(onAdd).toHaveBeenCalledWith("env");
  });

  it("calls onAdd with 'startAt' when startAt is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("startAt"));
    expect(onAdd).toHaveBeenCalledWith("startAt");
  });

  it("calls onAdd with 'endAt' when endAt is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("endAt"));
    expect(onAdd).toHaveBeenCalledWith("endAt");
  });
});
