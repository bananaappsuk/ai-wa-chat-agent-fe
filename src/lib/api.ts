const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const API_BASE = `${API_URL}/api`;
export const WS_BASE = API_URL.replace(/^http/, "ws");

const TOKEN_KEY = "ai_chat_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  const tok = tokenStore.get();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    const detail = data?.detail ?? data?.error;
    let msg: string;
    if (typeof detail === "string") {
      msg = detail;
    } else if (Array.isArray(detail)) {
      msg = detail
        .map((d: { msg?: string; loc?: (string | number)[] }) => {
          const field = Array.isArray(d?.loc) ? d.loc.filter((x) => x !== "body").join(".") : "";
          return field ? `${field}: ${d?.msg || "invalid"}` : d?.msg || "invalid";
        })
        .join("; ");
    } else if (detail && typeof detail === "object") {
      msg = (detail as { msg?: string }).msg || JSON.stringify(detail);
    } else {
      msg = res.statusText || "Request failed";
    }
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: unknown) => request<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  company_name?: string | null;
  phone?: string | null;
  plan: string;
  role: "user" | "moderator" | "admin";
  banned: boolean;
  created_at?: string;
};

export type AuthResponse = { access_token: string; token_type: string; user: ApiUser };

export const auth = {
  login: (email: string, password: string) => api.post<AuthResponse>("/auth/login", { email, password }),
  signup: (payload: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
  }) => api.post<AuthResponse>("/auth/signup", payload),
  me: () => api.get<ApiUser>("/profile/me"),
};

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  score: "hot" | "warm" | "cold" | null;
  source: string | null;
  tags: string[];
  blacklisted?: boolean;
  created_at: string;
  updated_at: string;
};

export const leads = {
  list: () => api.get<Lead[]>("/leads"),
  create: (b: Partial<Lead>) => api.post<Lead>("/leads", b),
  update: (id: string, b: Partial<Lead>) => api.patch<Lead>(`/leads/${id}`, b),
  remove: (id: string) => api.del<void>(`/leads/${id}`),
};

export type Message = {
  id: string;
  user_id: string;
  lead_id: string;
  direction: "inbound" | "outbound";
  message: string;
  status: string;
  twilio_sid?: string | null;
  error?: string | null;
  created_at: string;
};

export const messages = {
  list: (leadId: string) => api.get<Message[]>(`/messages/${leadId}`),
  send: (leadId: string, message: string, mediaUrl?: string) =>
    api.post<Message>("/send-message", { lead_id: leadId, message, media_url: mediaUrl }),
};

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
};

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  prompt: string | null;
  tone: "sales" | "support" | "neutral";
  knowledge_base: string | null;
  status: "active" | "inactive";
  callback_number?: string | null;
  logo_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  website_url?: string | null;
  social_links?: SocialLinks;
  welcome_message?: string | null;
  terms_text?: string | null;
  created_at: string;
  updated_at: string;
};

export const agents = {
  list: () => api.get<Agent[]>("/agents"),
  create: (b: Partial<Agent>) => api.post<Agent>("/agents", b),
  update: (id: string, b: Partial<Agent>) => api.patch<Agent>(`/agents/${id}`, b),
  remove: (id: string) => api.del<void>(`/agents/${id}`),
};

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  message: string | null;
  media_url: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

export const campaigns = {
  list: () => api.get<Campaign[]>("/campaigns"),
  create: (b: Partial<Campaign>) => api.post<Campaign>("/campaigns", b),
  update: (id: string, b: Partial<Campaign>) => api.patch<Campaign>(`/campaigns/${id}`, b),
  remove: (id: string) => api.del<void>(`/campaigns/${id}`),
};

export type Blast = {
  id: string;
  user_id: string;
  name: string;
  message: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
};

export const blasts = {
  list: () => api.get<Blast[]>("/blasts"),
  create: (b: { name: string; message: string; recipients: string[] }) => api.post<Blast>("/blasts", b),
  recipients: (id: string) => api.get<Array<{ id: string; phone: string; status: string; error?: string }>>(`/blasts/${id}/recipients`),
  remove: (id: string) => api.del<void>(`/blasts/${id}`),
};

export type AdminUser = ApiUser & { roles: string[]; company_name?: string | null };

export const admin = {
  list: () => api.get<AdminUser[]>("/admin/users"),
  ban: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/ban`),
  unban: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/unban`),
  remove: (id: string) => api.del<void>(`/admin/users/${id}`),
  setRole: (id: string, role: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/role`, { role }),
  setPlan: (id: string, plan: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/plan`, { plan }),
};

export const profile = {
  me: () => api.get<ApiUser>("/profile/me"),
  update: (b: { full_name?: string; company_name?: string; phone?: string }) =>
    api.patch<ApiUser>("/profile/me", b),
};

export const dashboard = {
  stats: () =>
    api.get<{
      counts: { leads: number; agents: number; campaigns: number; messages: number };
      recent_leads: Lead[];
      recent_agents: Agent[];
    }>("/dashboard/stats"),
};

export const blacklist = {
  list: () => api.get<Array<{ id: string; phone: string; reason?: string }>>("/blacklist"),
  add: (phone: string, reason?: string) => api.post<{ ok: boolean }>("/blacklist", { phone, reason }),
  remove: (phone: string) => api.del<{ ok: boolean }>("/blacklist", { phone }),
};
