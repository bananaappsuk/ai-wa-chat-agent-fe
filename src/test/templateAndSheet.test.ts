import { describe, expect, it } from "vitest";
import { checkTemplateDraft, templateVariables } from "@/components/CreateWhatsAppTemplate";
import { isSendable, SAMPLE_SHEET_ROWS } from "@/pages/WhatsAppBlast";
import type { PreparedContact, WhatsAppTemplateDraft } from "@/lib/api";

const draft = (p: Partial<WhatsAppTemplateDraft> = {}): WhatsAppTemplateDraft => ({
  name: "Day 3", category: "MARKETING", language: "en", body: "Hi {{1}}, thanks!", buttons: [], samples: { "1": "Jane" }, ...p,
});

describe("Create WhatsApp template checks", () => {
  it("accepts a valid draft", () => {
    expect(checkTemplateDraft(draft())).toEqual([]);
  });
  it("finds variables in order", () => {
    expect(templateVariables("Hi {{2}} and {{1}} {{1}}")).toEqual(["1", "2"]);
  });
  it("flags what WhatsApp would reject", () => {
    const p = checkTemplateDraft(draft({
      body: "x".repeat(1025) + " {{1}} {{3}}", samples: {}, footer: "{{1}}",
      buttons: [{ type: "URL", title: "Website", url: "http://a" }, { type: "PHONE_NUMBER", title: "Call", phone: "0745" }],
    }));
    expect(p.join("\n")).toMatch(/1037 characters — WhatsApp allows 1024/);
    expect(p.join("\n")).toMatch(/numbered in order/);
    expect(p.join("\n")).toMatch(/sample value for \{\{1\}\}/);
    expect(p.join("\n")).toMatch(/footer can't contain variables/);
    expect(p.join("\n")).toMatch(/must start with https/);
    expect(p.join("\n")).toMatch(/international number/);
  });
  it("is stable across repeated checks", () => {
    const d = draft({ footer: "Build, Test and Train" });
    expect(checkTemplateDraft(d)).toEqual([]);
    expect(checkTemplateDraft(d)).toEqual([]);
  });
});

const c = (status: PreparedContact["status"], phone: string | null = "+447700900123"): PreparedContact => ({ row: 2, name: "Jane", phone, raw: "", status, note: null });
const none = { landline: false, international: false, already_sent: false };

describe("WA Blast numbers check", () => {
  it("sends ready numbers only, unless you include the optional groups", () => {
    expect(["ok", "duplicate", "invalid", "landline", "international", "opted_out", "already_sent"].map((s) => isSendable(c(s as PreparedContact["status"]), none)))
      .toEqual([true, false, false, false, false, false, false]);
    expect(isSendable(c("landline"), { ...none, landline: true })).toBe(true);
    expect(isSendable(c("already_sent"), { ...none, already_sent: true })).toBe(true);
    expect(isSendable(c("opted_out"), { landline: true, international: true, already_sent: true })).toBe(false);
  });
  it("sample sheet has the columns the cleaner looks for", () => {
    expect(SAMPLE_SHEET_ROWS[0]).toEqual(["First Name", "Last Name", "Mobile Number"]);
  });
});
