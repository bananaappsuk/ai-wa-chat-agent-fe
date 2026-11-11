import { describe, expect, it } from "vitest";
import { formatChatMessageText } from "@/pages/LiveChat";

const tpl = [{ id: "t1", name: "GBBS follow-up 2026", content_sid: "HX6c346b2100b56f1b930330f92293f5ac" }] as never[];

describe("Live Chat shows what was actually sent", () => {
  it("shows the sent template text, not the template id", () => {
    const m = { message: "Hi Sriram,\n\nI’m the AI assistant…", content_sid: "HX6c346b2100b56f1b930330f92293f5ac", message_type: "template" } as never;
    expect(formatChatMessageText(m, tpl)).toBe("Hi Sriram,\n\nI’m the AI assistant…");
  });
  it("falls back to the template name when only a placeholder was stored", () => {
    const m = { message: "[template:HX6c346b2100b56f1b930330f92293f5ac]", content_sid: "HX6c346b2100b56f1b930330f92293f5ac" } as never;
    expect(formatChatMessageText(m, tpl)).toBe("Template: GBBS follow-up 2026");
  });
  it("keeps plain messages unchanged", () => {
    expect(formatChatMessageText({ message: "Hi" } as never, tpl)).toBe("Hi");
  });
});
