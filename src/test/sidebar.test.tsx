import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import MobileSidebar from "@/components/MobileSidebar";

// React 18+: tell React this is a test environment so act() works without warnings.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const signOut = vi.fn(async () => {});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signOut, user: { role: "admin" } }),
}));

let host: HTMLDivElement;
let root: Root;

const renderAt = async (ui: ReactNode) => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={ui} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
  });
};

const signOutButton = () =>
  Array.from(host.querySelectorAll("button")).find((b) => /sign out/i.test(b.textContent || "")) as
    | HTMLButtonElement
    | undefined;

const click = async (el: HTMLElement) => {
  await act(async () => {
    el.click();
  });
};

describe("Sign Out stays reachable", () => {
  beforeEach(() => {
    signOut.mockClear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("desktop sidebar: the menu scrolls on its own so Help / Sign Out stay pinned at the bottom", async () => {
    await renderAt(<AppSidebar />);
    const nav = host.querySelector("aside nav") as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.className).toMatch(/\bflex-1\b/);
    expect(nav.className).toMatch(/\bmin-h-0\b/);
    expect(nav.className).toMatch(/\boverflow-y-auto\b/);

    const btn = signOutButton();
    expect(btn).toBeDefined();
    expect(nav.contains(btn!)).toBe(false); // outside the scrolling menu, always visible
    expect(host.textContent).toContain("Admin");

    await click(btn!);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("login page");
  });

  it("mobile drawer scrolls so Sign Out can be reached on short screens", async () => {
    const onClose = vi.fn();
    await renderAt(<MobileSidebar open onClose={onClose} />);
    const btn = signOutButton();
    expect(btn).toBeDefined();
    expect(btn!.closest("div.overflow-y-auto")).not.toBeNull();

    await click(btn!);
    expect(onClose).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("login page");
  });
});
