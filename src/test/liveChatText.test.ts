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

import { hotFirst, mergeHotAndRecent } from "@/pages/LiveChat";

const lead = (id: string, score: string | null) => ({ id, name: id, phone: null, score }) as never;

describe("Live Chat lists hot chats first", () => {
  it("puts hot chats above the rest and keeps newest-first order inside each group", () => {
    const list = [lead("a", "cold"), lead("b", "hot"), lead("c", "warm"), lead("d", "hot"), lead("e", null)];
    expect(hotFirst(list).map((l: { id: string }) => l.id)).toEqual(["b", "d", "a", "c", "e"]);
  });
  it("keeps hot chats that are older than the 50 newest, without duplicates", () => {
    const merged = mergeHotAndRecent([lead("old-hot", "hot"), lead("b", "hot")], [lead("b", "hot"), lead("c", "cold")]);
    expect(merged.map((l: { id: string }) => l.id)).toEqual(["old-hot", "b", "c"]);
  });
});
