export const API_BASE = "https://crowdrental-api.serviceblocks.biz/api/v1";

const TOKEN_KEY = "cr_admin_token";
const USER_KEY = "cr_admin_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser(): any {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(USER_KEY);
  return v ? JSON.parse(v) : null;
}
export function setStoredUser(u: any) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Opts = {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  isForm?: boolean;
  auth?: boolean;
};

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, isForm, auth = true } = opts;
  const url = new URL(API_BASE + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  const h: Record<string, string> = { Accept: "application/json", ...headers };
  if (auth) {
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
  }
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) {
      payload = body as FormData;
    } else {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }
  const res = await fetch(url.toString(), { method, headers: h, body: payload });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (res.status === 401 && auth && typeof window !== "undefined") {
      setToken(null);
      setStoredUser(null);
    }
    const msg =
      (data && (data.detail?.[0]?.msg || data.detail || data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, typeof msg === "string" ? msg : "Request failed", data);
  }
  return data as T;
}

export function extractToken(res: any): string | null {
  if (!res) return null;
  return (
    res.access_token ||
    res.token ||
    res.session?.access_token ||
    res.data?.access_token ||
    res.data?.token ||
    null
  );
}
export function extractUser(res: any): any {
  return res?.admin || res?.user || res?.data?.admin || res?.data?.user || null;
}

// Normalize a paginated response into { items, total, page, page_size }
export function normalizeList(res: any): { items: any[]; total: number; page: number; page_size: number } {
  if (Array.isArray(res)) return { items: res, total: res.length, page: 1, page_size: res.length };
  const items = res?.items || res?.data || res?.results || [];
  const total = res?.total ?? res?.count ?? items.length;
  const page = res?.page ?? 1;
  const page_size = res?.page_size ?? res?.per_page ?? items.length;
  return { items, total, page, page_size };
}
