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
    expect(screen.getByText("String")).toBeDefined();
    expect(screen.getByText("Number")).toBeDefined();
    expect(screen.getByText("Datetime")).toBeDefined();
    expect(screen.getByText("Boolean")).toBeDefined();
  });

  it("opens dropdown and shows sugar condition types", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("Environment")).toBeDefined();
    expect(screen.getByText("Start At")).toBeDefined();
    expect(screen.getByText("End At")).toBeDefined();
  });

  it("opens dropdown and shows group types, match annotations, and custom", async () => {
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={vi.fn()} />);
    await user.click(screen.getByText("Add condition"));
    expect(screen.getByText("AND Group")).toBeDefined();
    expect(screen.getByText("OR Group")).toBeDefined();
    expect(screen.getByText("Match Annotations")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();
  });

  it("calls onAdd with 'and' when AND Group is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("AND Group"));
    expect(onAdd).toHaveBeenCalledWith("and");
  });

  it("calls onAdd with 'or' when OR Group is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("OR Group"));
    expect(onAdd).toHaveBeenCalledWith("or");
  });

  it("calls onAdd with 'matchAnnotations' when Match Annotations is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("Match Annotations"));
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
    await user.click(screen.getByText("String"));
    expect(onAdd).toHaveBeenCalledWith("string");
  });

  it("calls onAdd with 'env' when Environment is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("Environment"));
    expect(onAdd).toHaveBeenCalledWith("env");
  });

  it("calls onAdd with 'startAt' when Start At is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("Start At"));
    expect(onAdd).toHaveBeenCalledWith("startAt");
  });

  it("calls onAdd with 'endAt' when End At is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddConditionMenu onAdd={onAdd} />);
    await user.click(screen.getByText("Add condition"));
    await user.click(screen.getByText("End At"));
    expect(onAdd).toHaveBeenCalledWith("endAt");
  });
});
