/**
 * Meta Embedded Signup v4 (Facebook Login for Business).
 * Holds authorization code and session IDs in memory only — never browser web storage.
 */
export type EmbeddedSignupSession = {
  waba_id: string;
  phone_number_id: string;
  display_phone_number?: string;
  business_id?: string;
  event?: string;
};

export type EmbeddedSignupLaunchConfig = {
  appId: string;
  configId: string;
  graphVersion: string;
};

type FbSdk = {
  init: (opts: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
  login: (
    cb: (response: { authResponse?: { code?: string } | null; status?: string }) => void,
    opts: Record<string, unknown>
  ) => void;
};

declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "FINISH_OBO_MIGRATION",
  "FINISH_GRANT_ONLY_API_ACCESS",
]);

export function isTrustedFacebookOrigin(origin: string): boolean {
  try {
    const u = new URL(origin.trim());
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host === "facebook.com" || host.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

export function parseEmbeddedSignupMessage(event: { origin: string; data: unknown }): EmbeddedSignupSession | null {
  if (!isTrustedFacebookOrigin(event.origin)) return null;
  let payload: unknown = event.data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  const data = payload as {
    type?: string;
    event?: string;
    data?: Record<string, unknown>;
  };
  if (data.type !== "WA_EMBEDDED_SIGNUP") return null;
  const evt = String(data.event || "").trim().toUpperCase();
  if (evt === "CANCEL" || evt === "ERROR") return null;
  if (evt && !FINISH_EVENTS.has(evt) && evt !== "FINISH") return null;
  const inner = data.data && typeof data.data === "object" ? data.data : {};
  const waba = String(inner.waba_id || "").trim();
  const pnid = String(inner.phone_number_id || "").trim();
  if (!waba || !pnid) return null;
  const session: EmbeddedSignupSession = { waba_id: waba, phone_number_id: pnid, event: evt || "FINISH" };
  const display = String(inner.display_phone_number || "").trim();
  const business = String(inner.business_id || "").trim();
  if (display) session.display_phone_number = display;
  if (business) session.business_id = business;
  return session;
}

function loadFacebookSdk(): Promise<FbSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    const finish = () => {
      if (window.FB) resolve(window.FB);
      else reject(new Error("Meta SDK failed to load"));
    };
    window.fbAsyncInit = finish;
    if (existing) {
      if (window.FB) finish();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = SDK_SRC;
    script.onerror = () => reject(new Error("Meta SDK failed to load"));
    document.head.appendChild(script);
    window.setTimeout(() => {
      if (!window.FB) reject(new Error("Meta SDK timed out"));
    }, 15000);
  });
}

export async function launchEmbeddedSignup(
  cfg: EmbeddedSignupLaunchConfig
): Promise<{ code: string; session: EmbeddedSignupSession }> {
  const fb = await loadFacebookSdk();
  const version = cfg.graphVersion.replace(/^v/i, "") ? cfg.graphVersion : `v${cfg.graphVersion}`;
  fb.init({
    appId: cfg.appId,
    autoLogAppEvents: true,
    xfbml: true,
    version: version.startsWith("v") ? version : `v${version}`,
  });

  let session: EmbeddedSignupSession | null = null;
  const onMessage = (event: MessageEvent) => {
    const parsed = parseEmbeddedSignupMessage(event);
    if (parsed) session = parsed;
  };
  window.addEventListener("message", onMessage);

  try {
    const code = await new Promise<string>((resolve, reject) => {
      fb.login(
        (response) => {
          const value = response?.authResponse?.code;
          if (value && typeof value === "string") {
            resolve(value);
            return;
          }
          reject(new Error("Meta signup was cancelled or did not return an authorization code"));
        },
        {
          config_id: cfg.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            sessionInfoVersion: "3",
          },
        }
      );
    });

    const deadline = Date.now() + 4000;
    while (!session && Date.now() < deadline) {
      await new Promise((r) => window.setTimeout(r, 50));
    }
    if (!session) {
      throw new Error("Meta signup finished without a phone number and WABA. Please try again.");
    }
    return { code, session };
  } finally {
    window.removeEventListener("message", onMessage);
  }
}
