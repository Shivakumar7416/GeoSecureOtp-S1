// src/auth.js
export const TOKEN_KEY = "geo_secure_jwt";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Fetch wrapper that adds Authorization if token exists
export async function authedFetch(url, opts = {}) {
  const token = getToken();
  opts.headers = opts.headers || {};
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, opts);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    return { ok: res.ok, status: res.status, json };
  } else {
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }
}
