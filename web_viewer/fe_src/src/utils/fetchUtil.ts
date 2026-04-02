export function getAccessToken(): string {
  return localStorage.getItem("lux_access_token") || "";
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
}

export async function apiFetch(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { withAuth = false, headers, ...rest } = options;
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

  return fetch(finalUrl, {
    ...rest,
    headers: mergedHeaders,
  });
}

export async function apiGetJson<T = unknown>(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(pathOrUrl, options);
  return res.json() as Promise<T>;
}
