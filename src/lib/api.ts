const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const API_BASE = `${API_URL}/api`;
export const WS_BASE = API_URL.replace(/^http/, "ws");

const TOKEN_KEY = "ai_chat_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
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
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // 401 always clears; 403 on profile/me also clears banned sessions
      if (res.status === 401 || path.startsWith("/profile/")) {
        tokenStore.clear();
      }
    }
    const detail = (data as { detail?: unknown; error?: unknown } | null)?.detail
      ?? (data as { error?: unknown } | null)?.error;
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
      const d = detail as { msg?: string; message?: string };
      msg = d.message || d.msg || "Request failed";
    } else {
      msg = res.statusText || "Request failed";
    }
    // Never surface raw stack-like payloads
    if (msg.length > 500 || /traceback|exception at/i.test(msg)) {
      msg = res.status === 429 ? "Too many requests. Please try again later." : "Request failed";
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
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  twilio_whatsapp_to?: string | null;
  timezone?: string | null;
  locale?: string | null;
  avatar_url?: string | null;
  notification_preferences?: Record<string, boolean> | null;
  plan: string;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  role: "user" | "agent" | "moderator" | "admin";
  banned: boolean;
  active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AuthResponse = { access_token: string; token_type: string; user: ApiUser };

export type PageResult<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

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
  forgotPassword: (email: string) =>
    api.post<{ ok: boolean; message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post<{ ok: boolean; message: string }>("/auth/reset-password", { token, new_password }),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ ok: boolean; message: string }>("/auth/change-password", {
      current_password,
      new_password,
    }),
};

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  company?: string | null;
  score: "hot" | "warm" | "cold" | null;
  lead_score?: number | null;
  score_updated_at?: string | null;
  source: string | null;
  tags: string[];
  blacklisted?: boolean;
  whatsapp_consent_status?: "unknown" | "pending" | "opted_in" | "opted_out" | string;
  whatsapp_consent_source?: string | null;
  whatsapp_consent_at?: string | null;
  whatsapp_opted_out_at?: string | null;
  whatsapp_opt_out_reason?: string | null;
  ai_paused?: boolean;
  needs_human?: boolean;
  takeover_by?: string | null;
  takeover_at?: string | null;
  last_inbound_at?: string | null;
  whatsapp_window_expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadPage = {
  items: Lead[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type LeadListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  score?: string;
  consent_status?: string;
  blacklist_status?: string;
  agent_id?: string;
  source?: string;
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  ai_paused?: string;
  needs_human?: string;
  takeover_active?: string;
  window_status?: string;
};

export type LeadOption = {
  id: string;
  name: string;
  phone: string | null;
  score?: string | null;
  blacklisted?: boolean;
  whatsapp_consent_status?: string;
};

export type LeadImportResult = {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string }>;
  errors_truncated?: boolean;
};

function leadQuery(params?: LeadListParams): string {
  const qs = new URLSearchParams();
  if (!params) return "";
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const leads = {
  list: (params?: LeadListParams) => api.get<LeadPage>(`/leads${leadQuery(params)}`),
  options: (params?: { search?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get<LeadOption[]>(`/leads/options${suffix}`);
  },
  create: (b: Partial<Lead>) => api.post<Lead>("/leads", b),
  update: (id: string, b: Partial<Lead>) => api.patch<Lead>(`/leads/${id}`, b),
  remove: (id: string) => api.del<void>(`/leads/${id}`),
  pauseAi: (id: string) => api.post<Lead>(`/leads/${id}/ai/pause`),
  resumeAi: (id: string) => api.post<Lead>(`/leads/${id}/ai/resume`),
  takeOver: (id: string) => api.post<Lead>(`/leads/${id}/takeover`),
  handBack: (id: string) => api.post<Lead>(`/leads/${id}/handback`),
  markNeedsHuman: (id: string) => api.post<Lead>(`/leads/${id}/needs-human`),
  clearNeedsHuman: (id: string) => api.del<Lead>(`/leads/${id}/needs-human`),
  getConsent: (id: string) =>
    api.get<{
      whatsapp_consent_status: string;
      whatsapp_consent_source?: string | null;
      whatsapp_consent_at?: string | null;
      whatsapp_opted_out_at?: string | null;
      blacklisted: boolean;
      recent_events: Array<Record<string, unknown>>;
    }>(`/leads/${id}/consent`),
  optIn: (id: string, body?: { source?: string; proof?: string }) =>
    api.post<Lead>(`/leads/${id}/consent/opt-in`, body || {}),
  optOut: (id: string, body?: { source?: string; reason?: string; proof?: string }) =>
    api.post<Lead>(`/leads/${id}/consent/opt-out`, body || {}),
  whatsappHistory: (id: string, params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get<Record<string, unknown>>(`/leads/${id}/whatsapp-history${suffix}`);
  },
  bulkAction: (body: { lead_ids: string[]; action: string; value?: unknown }) =>
    api.post<{ action: string; requested: number; affected: number; skipped: number; failed: number }>(
      "/leads/bulk-action",
      body,
    ),
  importCsv: async (file: File, duplicatePolicy: "skip" | "update" | "fail" = "skip") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("duplicate_policy", duplicatePolicy);
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${API_BASE}/leads/import`, { method: "POST", headers, body: fd });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (res.status === 401) tokenStore.clear();
      const detail = (data as { detail?: unknown } | null)?.detail;
      throw new ApiError(res.status, typeof detail === "string" ? detail : res.statusText || "Import failed");
    }
    return data as LeadImportResult;
  },
  exportCsv: async (params?: LeadListParams) => {
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${API_BASE}/leads/export${leadQuery(params)}`, { headers });
    if (!res.ok) {
      if (res.status === 401) tokenStore.clear();
      const text = await res.text();
      let msg = res.statusText || "Export failed";
      try {
        const j = JSON.parse(text);
        if (typeof j?.detail === "string") msg = j.detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  sampleCsvUrl: () => `${API_BASE}/leads/sample.csv`,
};

export type MediaItem = {
  url?: string;
  content_type?: string;
  filename?: string | null;
  index?: number;
};

export type Message = {
  id: string;
  user_id: string;
  lead_id: string;
  direction: "inbound" | "outbound";
  message: string;
  status: string;
  message_type?: string;
  media_url?: string | null;
  media_content_type?: string | null;
  media_filename?: string | null;
  media_items?: MediaItem[];
  template_id?: string | null;
  template_name?: string | null;
  content_sid?: string | null;
  content_variables?: Record<string, string> | null;
  sender_type?: "ai" | "human" | "system" | null;
  agent_id?: string | null;
  agent_name?: string | null;
  message_purpose?: string | null;
  provider?: "twilio" | "meta";
  provider_message_id?: string | null;
  twilio_sid?: string | null;
  error?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  created_at: string;
};

export type MediaUploadResult = {
  id: string;
  url: string;
  path: string;
  content_type: string;
  filename: string;
  size: number;
  message_type: string;
};

export const mediaApi = {
  upload: async (file: File): Promise<MediaUploadResult> => {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${API_BASE}/media/upload`, { method: "POST", headers, body: fd });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (res.status === 401) tokenStore.clear();
      const detail = (data as { detail?: unknown } | null)?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : res.status === 429
            ? "Too many requests. Please try again later."
            : res.statusText || "Upload failed";
      throw new ApiError(res.status, msg);
    }
    return data as MediaUploadResult;
  },
  proxyUrl: (messageId: string, mediaIndex = 0) => {
    const tok = tokenStore.get() || "";
    return `${API_BASE}/messages/${messageId}/media/${mediaIndex}?access_token=${encodeURIComponent(tok)}`;
  },
};

export const messages = {
  list: (leadId: string) => api.get<Message[]>(`/messages/${leadId}`),
  checkEligibility: (body: {
    lead_id?: string;
    phone?: string;
    message_purpose?: string;
    template_id?: string;
    has_media?: boolean;
  }) =>
    api.post<{
      allowed: boolean;
      reason_code: string;
      safe_message: string;
      consent_status: string;
      window_status: string;
      blacklist_status: string;
      template_required: boolean;
      sender_configured: boolean;
    }>("/messages/check-eligibility", body),
  send: (
    leadId: string,
    message?: string,
    mediaUrl?: string,
    opts?: {
      template_id?: string;
      content_sid?: string;
      content_variables?: Record<string, string>;
      media_content_type?: string;
      media_filename?: string;
      message_purpose?: string;
    },
  ) =>
    api.post<Message>("/send-message", {
      lead_id: leadId,
      message: message || undefined,
      media_url: mediaUrl,
      media_content_type: opts?.media_content_type,
      media_filename: opts?.media_filename,
      template_id: opts?.template_id,
      content_sid: opts?.content_sid,
      content_variables: opts?.content_variables,
      message_purpose: opts?.message_purpose,
    }),
};

export type TemplateStatus = "draft" | "pending" | "approved" | "rejected";

export type WaTemplate = {
  id: string;
  user_id: string;
  name: string;
  content_sid: string;
  content_sid_masked?: string;
  language: string;
  status: TemplateStatus;
  variables: string[];
  created_at: string;
  updated_at: string;
  whatsapp_approval_status?: string | null;
  whatsapp_approval_label?: string | null;
  whatsapp_approval_emoji?: string | null;
  whatsapp_category?: string | null;
  whatsapp_sendable?: boolean;
  business_initiated?: boolean | null;
  user_initiated?: boolean | null;
  provider?: string;
  friendly_name?: string;
  whatsapp_approval_checked_at?: string | null;
};

export const templates = {
  list: (params?: { status?: string; whatsapp_status?: string; q?: string; refresh?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.whatsapp_status) qs.set("whatsapp_status", params.whatsapp_status);
    if (params?.q) qs.set("q", params.q);
    if (params?.refresh) qs.set("refresh", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<WaTemplate[]>(`/templates${suffix}`);
  },
  get: (id: string) => api.get<WaTemplate>(`/templates/${id}`),
  create: (b: Partial<WaTemplate>) => api.post<WaTemplate>("/templates", b),
  update: (id: string, b: Partial<WaTemplate>) => api.patch<WaTemplate>(`/templates/${id}`, b),
  remove: (id: string) => api.del<void>(`/templates/${id}`),
  refreshStatus: (id: string) => api.post<WaTemplate>(`/templates/${id}/refresh-status`, {}),
};

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
};

export type AgentKind = "inbound" | "outbound" | "sales" | "support";

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  kind?: AgentKind;
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
  support_email?: string | null;
  business_hours?: string | null;
  booking_link?: string | null;
  price_floor?: string | null;
  price_ceiling?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentCampaignOption = {
  id: string;
  name: string;
  kind: string;
  description?: string | null;
  tone?: string | null;
  campaign_capable: boolean;
  campaign_enabled: boolean;
  status?: string;
};

export const agents = {
  list: () => api.get<Agent[]>("/agents"),
  options: () => api.get<AgentCampaignOption[]>("/agents/options"),
  create: (b: Partial<Agent>) => api.post<Agent>("/agents", b),
  update: (id: string, b: Partial<Agent>) => api.patch<Agent>(`/agents/${id}`, b),
  remove: (id: string) => api.del<void>(`/agents/${id}`),
  extractKnowledge: async (file: File): Promise<{ filename: string; text: string; chars: number }> => {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${API_BASE}/agents/extract-knowledge`, { method: "POST", headers, body: fd });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { detail: text };
    }
    if (!res.ok) {
      const detail =
        data && typeof data === "object" && "detail" in data
          ? String((data as { detail: unknown }).detail)
          : res.statusText;
      throw new Error(detail || "Knowledge extract failed");
    }
    return data as { filename: string; text: string; chars: number };
  },
};

export type Campaign = {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  message?: string | null;
  media_url?: string | null;
  media_content_type?: string | null;
  template_id?: string | null;
  content_sid?: string | null;
  content_variables?: Record<string, string> | null;
  status: string;
  content_mode?: "template" | "ai_agent";
  agent_id?: string | null;
  campaign_subject?: string | null;
  campaign_goal?: string | null;
  campaign_instructions?: string | null;
  campaign_language?: string | null;
  campaign_tone_override?: string | null;
  review_mode?: "sample_review" | "full_review" | "no_manual_review";
  preview_count?: number;
  ai_generation_status?: string | null;
  fallback_template_id?: string | null;
  allow_freeform_inside_window?: boolean;
  personalise_template_variables?: boolean;
  require_approval_before_start?: boolean;
  approved_at?: string | null;
  agent_snapshot?: { id?: string; name?: string; kind?: string; tone?: string } | null;
  ai_cost_estimate?: Record<string, unknown> | null;
  ai_context_mode?:
    | "campaign_only"
    | "campaign_and_lead_profile"
    | "campaign_and_summary"
    | "campaign_and_recent_chat"
    | "custom";
  include_lead_profile?: boolean;
  include_conversation_summary?: boolean;
  include_recent_messages?: boolean;
  recent_message_limit?: number;
  knowledge_scope?: "none" | "selected" | "topic_matched";
  campaign_knowledge_text?: string | null;
  required_topics?: string[] | null;
  prohibited_topics?: string[] | null;
  delivery_scope?: "open_window_only" | "all_eligible_recipients" | "template_only";
  knowledge_snapshot?: Record<string, unknown> | null;
  ai_ready_count?: number;
  ai_review_count?: number;
  ai_failed_count?: number;
  ai_input_tokens_total?: number;
  ai_output_tokens_total?: number;
  ai_estimated_cost_total?: number;
  recipient_source?: string | null;
  total_recipients?: number;
  queued_count?: number;
  processing_count?: number;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
  skipped_count?: number;
  cancelled_count?: number;
  replied_count?: number;
  progress_percentage?: number;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  paused_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
  rates?: {
    delivery_rate: number;
    read_rate: number;
    failure_rate: number;
    reply_rate: number;
    completion_rate: number;
  };
};

export type CampaignRecipient = {
  id: string;
  campaign_id: string;
  lead_id?: string | null;
  phone: string;
  name?: string | null;
  status: string;
  attempt_count?: number;
  error_message?: string | null;
  error_code?: string | null;
  twilio_sid?: string | null;
  replied_at?: string | null;
  content_source?: string | null;
  generated_message?: string | null;
  generated_template_variables?: Record<string, string> | null;
  ai_generation_status?: string | null;
  ai_approved?: boolean;
  ai_warnings?: string[];
  created_at: string;
  updated_at?: string;
};

export type CampaignAnalytics = {
  campaign: Campaign;
  status_counts: Record<string, number>;
  rates: NonNullable<Campaign["rates"]>;
  progress_percentage: number;
  recent_failures: CampaignRecipient[];
  top_errors: Array<{ message: string; count: number }>;
};

export const campaigns = {
  list: () => api.get<Campaign[]>("/campaigns"),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  create: (b: Record<string, unknown>) => api.post<Campaign>("/campaigns", b),
  update: (id: string, b: Record<string, unknown>) => api.patch<Campaign>(`/campaigns/${id}`, b),
  remove: (id: string) => api.del<void>(`/campaigns/${id}`),
  start: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/start?confirm_marketing=true`),
  eligibilityPreview: (id: string) =>
    api.get<{
      campaign_id: string;
      total_selected: number;
      eligible: number;
      eligible_freeform_ai?: number;
      eligible_ai_freeform?: number;
      eligible_template_ai?: number;
      eligible_template_fallback?: number;
      eligible_template_static?: number;
      opted_out: number;
      no_consent: number;
      blacklisted: number;
      closed_window: number;
      skipped_closed_window?: number;
      closed_window_missing_template?: number;
      template_required: number;
      template_not_approved?: number;
      invalid_number: number;
      duplicates_removed: number;
      other_blocked: number;
      samples?: Array<Record<string, unknown>>;
      template_meta?: {
        name?: string | null;
        content_sid?: string | null;
        content_sid_masked?: string | null;
        whatsapp_approval_status?: string | null;
        whatsapp_approval_label?: string | null;
        whatsapp_approval_emoji?: string | null;
        whatsapp_sendable?: boolean;
        warning_required?: boolean;
        warning_message?: string | null;
      };
    }>(`/campaigns/${id}/eligibility-preview`),
  aiPreview: (id: string, body?: { preview_count?: number; regenerate?: boolean; selected_lead_ids?: string[] }) =>
    api.post<{ campaign_id: string; previews: Array<Record<string, unknown>>; count: number }>(
      `/campaigns/${id}/ai-preview`,
      body || {},
    ),
  approveAiContent: (id: string) => api.post<Campaign>(`/campaigns/${id}/approve-ai-content`),
  approveRecipient: (cid: string, rid: string) =>
    api.post<CampaignRecipient>(`/campaigns/${cid}/recipients/${rid}/approve`),
  rejectRecipient: (cid: string, rid: string) =>
    api.post<CampaignRecipient>(`/campaigns/${cid}/recipients/${rid}/reject`),
  regenerateRecipient: (cid: string, rid: string) =>
    api.post<CampaignRecipient>(`/campaigns/${cid}/recipients/${rid}/regenerate`),
  pause: (id: string) => api.post<Campaign>(`/campaigns/${id}/pause`),
  resume: (id: string) => api.post<Campaign>(`/campaigns/${id}/resume`),
  cancel: (id: string) => api.post<Campaign>(`/campaigns/${id}/cancel`),
  retryFailed: (id: string) => api.post<Campaign>(`/campaigns/${id}/retry-failed`),
  recipients: (id: string, params?: { status?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get<{ items: CampaignRecipient[]; total: number; page: number; page_size: number }>(
      `/campaigns/${id}/recipients${suffix}`,
    );
  },
  analytics: (id: string) => api.get<CampaignAnalytics>(`/campaigns/${id}/analytics`),
};

export type Blast = {
  id: string;
  user_id: string;
  name: string;
  message: string;
  template_id?: string | null;
  content_sid?: string | null;
  content_variables?: Record<string, string> | null;
  message_purpose?: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  delivered_count?: number;
  read_count?: number;
  undelivered_count?: number;
  status: string;
  last_error?: string | null;
  created_at: string;
};

export const blasts = {
  list: () => api.get<Blast[]>("/blasts"),
  create: (b: {
    name: string;
    message?: string;
    recipients: string[];
    template_id?: string;
    content_variables?: Record<string, string>;
    media_url?: string;
    message_purpose?: string;
  }) => api.post<Blast>("/blasts", b),
  recipients: (id: string) => api.get<Array<{ id: string; phone: string; status: string; error?: string }>>(`/blasts/${id}/recipients`),
  remove: (id: string) => api.del<void>(`/blasts/${id}`),
};

export type AdminUser = ApiUser & { roles: string[]; company_name?: string | null };

export const admin = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    active?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    if (params?.search) q.set("search", params.search);
    if (params?.role) q.set("role", params.role);
    if (params?.active) q.set("active", params.active);
    const suffix = q.toString() ? `?${q}` : "";
    return api.get<PageResult<AdminUser>>(`/admin/users${suffix}`);
  },
  get: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
  create: (b: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    plan?: string;
    company_name?: string;
    phone?: string;
    active?: boolean;
  }) => api.post<AdminUser>("/admin/users", b),
  update: (id: string, b: Record<string, unknown>) => api.patch<AdminUser>(`/admin/users/${id}`, b),
  activate: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/activate`),
  deactivate: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/deactivate`),
  resetPassword: (id: string) => api.post<{ ok: boolean; message?: string }>(`/admin/users/${id}/reset-password`),
  ban: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/ban`),
  unban: (id: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/unban`),
  remove: (id: string) => api.del<void>(`/admin/users/${id}`),
  setRole: (id: string, role: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/role`, { role }),
  setPlan: (id: string, plan: string) => api.post<{ ok: boolean }>(`/admin/users/${id}/plan`, { plan }),
};

export const profile = {
  me: () => api.get<ApiUser>("/profile"),
  update: (b: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    company_name?: string;
    phone?: string;
    twilio_whatsapp_to?: string | null;
    timezone?: string;
    locale?: string;
    email?: string;
    current_password?: string;
    notification_preferences?: Record<string, boolean>;
  }) => api.patch<ApiUser>("/profile", b),
  uploadAvatar: async (file: File) => {
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/profile/avatar`, { method: "POST", headers, body: fd });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || "Avatar upload failed");
    }
    return (await res.json()) as ApiUser;
  },
  deleteAvatar: () => api.del<ApiUser>("/profile/avatar"),
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  summary: string;
  actor_id?: string | null;
  actor_name?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export const activityApi = {
  list: (params?: { page?: number; page_size?: number; event_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    if (params?.event_type) q.set("event_type", params.event_type);
    const suffix = q.toString() ? `?${q}` : "";
    return api.get<PageResult<ActivityEvent>>(`/activity${suffix}`);
  },
  forLead: (leadId: string, page = 1) =>
    api.get<PageResult<ActivityEvent>>(`/leads/${leadId}/activity?page=${page}&page_size=25`),
  forCampaign: (campaignId: string, page = 1) =>
    api.get<PageResult<ActivityEvent>>(`/campaigns/${campaignId}/activity?page=${page}&page_size=25`),
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  resource_type?: string | null;
  resource_id?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
};

export const notificationsApi = {
  list: (params?: { page?: number; unread?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.unread) q.set("unread", "true");
    const suffix = q.toString() ? `?${q}` : "";
    return api.get<PageResult<AppNotification>>(`/notifications${suffix}`);
  },
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => api.post<{ ok: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ ok: boolean; updated: number }>("/notifications/read-all"),
  remove: (id: string) => api.del<{ ok: boolean }>(`/notifications/${id}`),
};

export const settingsApi = {
  whatsappStatus: () =>
    api.get<{
      environment: string;
      sender_configured: boolean;
      sender_type: string;
      status_callback_configured: boolean;
      signature_validation_enabled: boolean;
      public_url_configured: boolean;
      template_capability_configured: boolean;
      messaging_service_configured: boolean;
      production_ready: boolean;
      warnings: string[];
    }>("/settings/whatsapp-status"),
  ai: () => api.get<AiSettings>("/settings/ai"),
  updateAi: (b: Partial<AiSettings>) => api.patch<AiSettings>("/settings/ai", b),
  testAi: (prompt: string, conversation_id?: string) =>
    api.post<{
      success: boolean;
      response: string;
      latency_ms: number;
      model: string;
      input_tokens: number;
      output_tokens: number;
      error_category?: string | null;
      moderation: { allowed: boolean; categories: string[] };
    }>("/settings/ai/test", { prompt, conversation_id }),
};

export type AiSettings = {
  enabled: boolean;
  globally_enabled?: boolean;
  api_key_configured?: boolean;
  model: string;
  fallback_model: string;
  temperature: number;
  max_output_tokens: number;
  summaries_enabled: boolean;
  extraction_enabled: boolean;
  moderation_enabled: boolean;
  analytics_enabled: boolean;
  daily_token_limit?: number;
  monthly_cost_limit?: number;
  requests_per_minute_limit?: number;
  ai_business_description?: string;
  ai_tone?: string;
  ai_custom_instructions?: string;
  ai_disallowed_topics?: string;
  ai_escalation_rules?: string;
  allowed_models?: string[];
  usage?: {
    requests_this_minute: number;
    tokens_today: number;
    cost_this_month: number;
    daily_token_limit: number;
    monthly_cost_limit: number;
    requests_per_minute_limit: number;
  };
};

export type ConversationSummary = {
  id?: string;
  summary?: string | null;
  updated_at?: string | null;
  summary_version?: number;
  message_count_covered?: number;
};

export const conversationsApi = {
  summary: (id: string) => api.get<ConversationSummary>(`/conversations/${id}/summary`),
  refreshSummary: (id: string) => api.post<{ ok: boolean }>(`/conversations/${id}/summary/refresh`),
  extract: (id: string) => api.post<{ ok: boolean }>(`/conversations/${id}/extract`),
  reclassify: (id: string) => api.post<{ ok: boolean; last_ai_error_category?: string }>(`/conversations/${id}/reclassify`),
};

export type AiSuggestion = {
  id: string;
  field: string;
  suggested_value: unknown;
  confidence: number;
  status: string;
  source_message_ids?: string[];
  extracted_at?: string;
};

export const aiSuggestionsApi = {
  list: (leadId: string) =>
    api.get<{
      items: AiSuggestion[];
      current_intent?: string;
      current_sentiment?: string;
      last_ai_error_category?: string;
    }>(`/leads/${leadId}/ai-suggestions`),
  accept: (leadId: string, id: string) => api.post<Lead>(`/leads/${leadId}/ai-suggestions/${id}/accept`),
  reject: (leadId: string, id: string) => api.post<{ ok: boolean }>(`/leads/${leadId}/ai-suggestions/${id}/reject`),
};

export const aiAnalyticsApi = {
  overview: (params?: { date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    const s = q.toString() ? `?${q}` : "";
    return api.get<Record<string, unknown>>(`/analytics/ai/overview${s}`);
  },
  outcomes: (params?: { date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    const s = q.toString() ? `?${q}` : "";
    return api.get<Record<string, unknown>>(`/analytics/ai/outcomes${s}`);
  },
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

export type BillingPlan = {
  key: string;
  name: string;
  price_gbp: number | null;
  price_display: string;
  period: string;
  popular: boolean;
  stripe_checkout: boolean;
  contact_sales: boolean;
  features: string[];
  entitlements: Record<string, unknown>;
  cta: string;
};

export type BillingSubscription = {
  plan: string;
  plan_name: string;
  price_display?: string | null;
  billing_cycle?: string;
  subscription_status: string;
  stripe_mode?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  trial_start?: string | null;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  cancelled_at?: string | null;
  latest_invoice_id?: string | null;
  last_payment_status?: string | null;
  last_payment_at?: string | null;
  entitlements: Record<string, unknown>;
  has_active_subscription: boolean;
  can_checkout: boolean;
  can_manage: boolean;
  use_portal_for_changes?: boolean;
};

export type BillingInvoice = {
  id: string;
  number?: string | null;
  status?: string | null;
  currency?: string | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  created?: number | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  period_start?: number | null;
  period_end?: number | null;
};

export const billing = {
  plans: () =>
    api.get<{
      plans: BillingPlan[];
      trial_days: number;
      currency: string;
      billing_cycle?: string;
      stripe_mode?: string;
      publishable_key?: string | null;
      contact_sales_url: string;
      disclaimer: string;
      addons_note: string;
    }>("/billing/plans"),
  subscription: () => api.get<BillingSubscription>("/billing/subscription"),
  invoices: (params?: { limit?: number; starting_after?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.starting_after) q.set("starting_after", params.starting_after);
    const s = q.toString() ? `?${q}` : "";
    return api.get<{ items: BillingInvoice[]; has_more?: boolean }>(`/billing/invoices${s}`);
  },
  checkout: (plan: string) => api.post<{ url: string }>("/billing/checkout", { plan }),
  portal: () => api.post<{ url: string }>("/billing/portal"),
};
