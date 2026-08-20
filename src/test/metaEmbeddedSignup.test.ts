import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { isTrustedFacebookOrigin, parseEmbeddedSignupMessage } from "@/lib/metaEmbeddedSignup";

const FINISH = {
  type: "WA_EMBEDDED_SIGNUP",
  event: "FINISH",
  data: {
    waba_id: "555555555555555",
    phone_number_id: "111111111111111",
    business_id: "222222222222222",
  },
};

describe("metaEmbeddedSignup origin and payload", () => {
  it("accepts https facebook.com hosts only", () => {
    expect(isTrustedFacebookOrigin("https://www.facebook.com")).toBe(true);
    expect(isTrustedFacebookOrigin("https://web.facebook.com")).toBe(true);
    expect(isTrustedFacebookOrigin("http://www.facebook.com")).toBe(false);
    expect(isTrustedFacebookOrigin("https://evilfacebook.com")).toBe(false);
    expect(isTrustedFacebookOrigin("https://connect.facebook.net")).toBe(false);
    expect(isTrustedFacebookOrigin("https://attacker.example")).toBe(false);
  });

  it("rejects postMessage from the wrong origin", () => {
    expect(
      parseEmbeddedSignupMessage({
        origin: "https://evil.example",
        data: JSON.stringify(FINISH),
      })
    ).toBeNull();
  });

  it("rejects unexpected event types", () => {
    expect(
      parseEmbeddedSignupMessage({
        origin: "https://www.facebook.com",
        data: JSON.stringify({ type: "OTHER", event: "FINISH", data: FINISH.data }),
      })
    ).toBeNull();
  });

  it("captures session IDs from a legitimate FINISH event", () => {
    const parsed = parseEmbeddedSignupMessage({
      origin: "https://www.facebook.com",
      data: JSON.stringify(FINISH),
    });
    expect(parsed).toEqual({
      waba_id: "555555555555555",
      phone_number_id: "111111111111111",
      business_id: "222222222222222",
      event: "FINISH",
    });
  });

  it("does not persist tokens or codes to web storage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    parseEmbeddedSignupMessage({
      origin: "https://www.facebook.com",
      data: JSON.stringify(FINISH),
    });
    expect(setItem).not.toHaveBeenCalled();
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../lib/metaEmbeddedSignup.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/\blocalStorage\b/);
    expect(src).not.toMatch(/\bsessionStorage\b/);
    expect(src).not.toMatch(/\baccess_token\b/);
  });
});
