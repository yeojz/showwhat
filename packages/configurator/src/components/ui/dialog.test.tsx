import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog.js";

describe("Dialog components", () => {
  it("renders a dialog with trigger", () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Open dialog")).toBeDefined();
  });

  it("opens dialog and shows content when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Title</DialogTitle>
            <DialogDescription>My Description</DialogDescription>
          </DialogHeader>
          <p>Body content</p>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("My Title")).toBeDefined();
    expect(screen.getByText("My Description")).toBeDefined();
    expect(screen.getByText("Body content")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("shows close button by default and hides it when showCloseButton is false", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <p>No close button</p>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("No close button")).toBeDefined();
    expect(screen.queryByText("Close")).toBeNull();
  });

  it("renders DialogFooter with close button when showCloseButton is true", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter showCloseButton>
            <span>Footer content</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Footer content")).toBeDefined();
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find((btn) => btn.textContent === "Close");
    expect(closeBtn).toBeDefined();
  });

  it("passes custom className to DialogHeader", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <DialogHeader className="header-class">Header</DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    const header = screen.getByText("Header");
    expect(header.className).toContain("header-class");
  });

  it("passes custom className to DialogTitle", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="title-class">Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    const title = screen.getByText("Title");
    expect(title.className).toContain("title-class");
  });

  it("passes custom className to DialogDescription", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription className="desc-class">Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    const desc = screen.getByText("Desc");
    expect(desc.className).toContain("desc-class");
  });

  it("passes custom className to DialogFooter", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter className="footer-class">Footer</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    const footer = screen.getByText("Footer");
    expect(footer.className).toContain("footer-class");
  });

  it("exports DialogOverlay and DialogPortal", () => {
    expect(DialogOverlay).toBeDefined();
    expect(DialogPortal).toBeDefined();
  });
});
