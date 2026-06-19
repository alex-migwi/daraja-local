export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : undefined;

  if (!response.ok) {
    const message = data?.error?.message ?? response.statusText;
    throw new Error(message);
  }

  return data as T;
}
