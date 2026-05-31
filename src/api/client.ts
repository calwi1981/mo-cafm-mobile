import { API_BASE_URL } from "../config";

export async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "api_error");
  return json;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "api_error");
  return json;
}
