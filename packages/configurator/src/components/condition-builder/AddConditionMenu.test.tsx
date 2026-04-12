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
    expect(await screen.findByText("string")).toBeDefined();
    expect(screen.getByText("number")).toBeDefined();
    expect(screen.getByText("datetime")).toBeDefined();
    expect(screen.getByText("bool")).toBeDefined();
  });

  it("opens dropdown and shows sugar condition types", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(await screen.findByText("env")).toBeDefined();
    expect(screen.getByText("startAt")).toBeDefined();
    expect(screen.getByText("endAt")).toBeDefined();
  });

  it("opens dropdown and shows group types, match annotations, and custom", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(await screen.findByText("and")).toBeDefined();
    expect(screen.getByText("or")).toBeDefined();
    expect(screen.getByText("checkAnnotations")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();
  });

  it("calls onAdd with 'and' when and is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("and"));
    expect(onAdd).toHaveBeenCalledWith("and");
  });

  it("calls onAdd with 'or' when or is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("or"));
    expect(onAdd).toHaveBeenCalledWith("or");
  });

  it("calls onAdd with 'checkAnnotations' when checkAnnotations is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("checkAnnotations"));
    expect(onAdd).toHaveBeenCalledWith("checkAnnotations");
  });

  it("calls onAdd with '__custom' when Custom is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("Custom"));
    expect(onAdd).toHaveBeenCalledWith("__custom");
  });

  it("calls onAdd with condition type when a primitive is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("string"));
    expect(onAdd).toHaveBeenCalledWith("string");
  });

  it("calls onAdd with 'env' when env is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("env"));
    expect(onAdd).toHaveBeenCalledWith("env");
  });

  it("calls onAdd with 'startAt' when startAt is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("startAt"));
    expect(onAdd).toHaveBeenCalledWith("startAt");
  });

  it("calls onAdd with 'endAt' when endAt is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(await screen.findByText("endAt"));
    expect(onAdd).toHaveBeenCalledWith("endAt");
  });
});
