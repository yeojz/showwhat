import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Menu,
  MenuPortal,
  MenuTrigger,
  MenuContent,
  MenuGroup,
  MenuLabel,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
} from "./menu.js";

describe("Menu components", () => {
  it("renders a menu with trigger", () => {
    render(
      <Menu>
        <MenuTrigger>Open menu</MenuTrigger>
        <MenuContent>
          <MenuItem>Item 1</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.getByText("Open menu")).toBeDefined();
  });

  it("opens menu and shows items when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open menu</MenuTrigger>
        <MenuContent>
          <MenuItem>Item 1</MenuItem>
          <MenuItem>Item 2</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open menu"));
    expect(await screen.findByText("Item 1")).toBeDefined();
    expect(screen.getByText("Item 2")).toBeDefined();
  });

  it("renders menu group and label", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuGroup>
            <MenuLabel>Group Label</MenuLabel>
            <MenuItem>Item</MenuItem>
          </MenuGroup>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Group Label")).toBeDefined();
  });

  it("renders separator", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuItem>Item 1</MenuItem>
          <MenuSeparator />
          <MenuItem>Item 2</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    await waitFor(() => {
      expect(screen.getByRole("separator")).toBeDefined();
    });
  });

  it("renders checkbox item", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuCheckboxItem checked>Check me</MenuCheckboxItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Check me")).toBeDefined();
  });

  it("renders radio group with radio items", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuRadioGroup value="a">
            <MenuRadioItem value="a">Option A</MenuRadioItem>
            <MenuRadioItem value="b">Option B</MenuRadioItem>
          </MenuRadioGroup>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Option A")).toBeDefined();
    expect(screen.getByText("Option B")).toBeDefined();
  });

  it("renders shortcut text", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuItem>
            Save
            <MenuShortcut>Ctrl+S</MenuShortcut>
          </MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Ctrl+S")).toBeDefined();
  });

  it("renders sub menu", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuSub>
            <MenuSubTrigger>More options</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem>Sub Item</MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("More options")).toBeDefined();
  });

  it("renders destructive variant item", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuItem variant="destructive">Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    const item = await screen.findByText("Delete");
    expect(item.closest("[data-variant='destructive']")).toBeDefined();
  });

  it("renders inset item", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuItem inset>Inset Item</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    const item = await screen.findByText("Inset Item");
    expect(item.closest("[data-inset]")).toBeDefined();
  });

  it("renders inset label", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuGroup>
            <MenuLabel inset>Inset Label</MenuLabel>
          </MenuGroup>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText("Open"));
    const label = await screen.findByText("Inset Label");
    expect(label.closest("[data-inset]")).toBeDefined();
  });

  it("exports MenuPortal", () => {
    expect(MenuPortal).toBeDefined();
  });
});
