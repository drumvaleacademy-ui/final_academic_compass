/**
 * REST API client.
 */

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN ?? "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");
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
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      // If the token is invalid or missing, clear local session, emit event and surface a clear error.
      if (res.status === 401 || res.status === 403) {
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
    return res.json();
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error(
        `Cannot reach the server at ${API_ORIGIN || window.location.origin}. ` +
        "If you are in production, set VITE_API_ORIGIN to your deployed API URL. " +
        "If you are in development, make sure the API server is running."
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
