/**
 * REST API client.
 */

const API_ORIGIN = ((
  (import.meta.env.API_ORIGIN ??
    import.meta.env.VITE_API_ORIGIN ??
    (typeof window !== "undefined" && (window as any).__API_ORIGIN__) ??
    "") as string
)).replace(/\/api\/?$/, "").replace(/\/$/, "");
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as any).message === "string" &&
      (err as any).message.toLowerCase().includes("failed to fetch"))
  );
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem("ac_token");
  const hadToken = !!token;
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      // If the token is invalid or missing, clear local session, emit event and surface a clear error.
      if ((res.status === 401 || res.status === 403) && hadToken) {
        try {
          localStorage.removeItem("ac_token");
          localStorage.removeItem("ac_user");
        } catch (_e) {}
        try {
          window.dispatchEvent(new CustomEvent("ac:unauthorized"));
        } catch (_e) {}
      }
      const err = await res.json().catch(() => ({ message: res.statusText || `HTTP ${res.status}` }));
      const msg = err.message || `Request failed (${res.status})`;
      throw new Error(res.status === 401 || res.status === 403 ? `Unauthorized: ${msg}` : msg);
    }

    const text = await res.text();
    if (!text) return null as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error(
        `The request to ${url} could not be completed. ` +
        "Check the API URL, deployment rewrite, CORS configuration, and network connection."
      );
    }
    throw err;
  }
}

export const api = {
  get:    <T>(path: string)                  => request<T>("GET",    path),
  post:   <T>(path: string, body: unknown)   => request<T>("POST",   path, body),
  put:    <T>(path: string, body: unknown)   => request<T>("PUT",    path, body),
  patch:  <T>(path: string, body: unknown)   => request<T>("PATCH",  path, body),
  delete: <T>(path: string)                  => request<T>("DELETE", path),
};
