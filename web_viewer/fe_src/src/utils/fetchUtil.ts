export function getAccessToken(): string {
  return localStorage.getItem("lux_access_token") || "";
}

function getRefreshToken(): string {
  return localStorage.getItem("lux_refresh_token") || "";
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("lux_access_token", accessToken);
  localStorage.setItem("lux_refresh_token", refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem("lux_access_token");
  localStorage.removeItem("lux_refresh_token");
}

function emitSessionExpired(): void {
  window.dispatchEvent(new CustomEvent("lux:session-expired"));
}

function toHeadersObject(input?: HeadersInit): Record<string, string> {
  if (!input) {
    return {};
  }
  if (input instanceof Headers) {
    return Object.fromEntries(input.entries());
  }
  if (Array.isArray(input)) {
    return Object.fromEntries(input);
  }
  return { ...input };
}

export interface ApiFetchOptions extends RequestInit {
  withAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(baseUrl: string): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return false;
    }
    setTokens(json.access_token, json.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function ensureRefreshed(baseUrl: string): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(baseUrl).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { withAuth = false, retryOnUnauthorized = true, headers, ...rest } = options;
  const mergedHeaders = toHeadersObject(headers);

  if (withAuth) {
    const token = getAccessToken();
    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const finalUrl = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${import.meta.env.VITE_API_BASE_URL}${pathOrUrl}`;

  const response = await fetch(finalUrl, {
    ...rest,
    headers: mergedHeaders,
  });

  if (withAuth && retryOnUnauthorized && response.status === 401 && getRefreshToken()) {
    const refreshed = await ensureRefreshed(import.meta.env.VITE_API_BASE_URL);
    if (refreshed) {
      const retryHeaders = toHeadersObject(headers);
      const token = getAccessToken();
      if (token) {
        retryHeaders.Authorization = `Bearer ${token}`;
      }
      return fetch(finalUrl, {
        ...rest,
        headers: retryHeaders,
      });
    }

    clearTokens();
    emitSessionExpired();
  }

  return response;
}

async function parseJsonSafe<T = unknown>(res: Response): Promise<T | null> {
  try {
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function apiGetJson<T = unknown>(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(pathOrUrl, options);
  return res.json() as Promise<T>;
}

export async function apiGetJsonOrThrow<T = unknown>(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(pathOrUrl, options);
  const json = await parseJsonSafe<T | { message?: string }>(res);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json && typeof json.message === "string"
        ? json.message
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}
