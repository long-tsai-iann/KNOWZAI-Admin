"use client";

import { loadToken, clearToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";

// 統一的後端呼叫封裝：帶 Bearer token、401 時清掉本機 token 並丟回登入頁
// （呼叫端 catch 到這個特殊錯誤時，導頁去 /login 由 UI 自己處理，這裡只負責
// 清乾淨過期的 token，避免使用者卡在一個看起來登入但其實 token 已失效的狀態）。
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const token = loadToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (resp.status === 401) {
    clearToken();
    throw new ApiError("登入已過期，請重新登入", 401);
  }

  let body = null;
  try {
    body = await resp.json();
  } catch (_) {
    // 有些成功回應可能沒有 body（例如某些 204），忽略解析失敗
  }

  if (!resp.ok) {
    const message = body?.error?.message || body?.error || `請求失敗（${resp.status}）`;
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), resp.status);
  }

  return body;
}

export const api = {
  login: (email, password) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch("/api/auth/me"),

  stats: () => apiFetch("/api/admin/stats"),

  users: (params = "") => apiFetch(`/api/admin/users${params}`),
  banUser: (id) => apiFetch(`/api/admin/users/${id}/ban`, { method: "POST" }),
  unbanUser: (id) => apiFetch(`/api/admin/users/${id}/unban`, { method: "POST" }),

  posts: (params = "") => apiFetch(`/api/admin/posts${params}`),
  hidePost: (id) => apiFetch(`/api/admin/posts/${id}/hide`, { method: "POST" }),
  unhidePost: (id) => apiFetch(`/api/admin/posts/${id}/unhide`, { method: "POST" }),
  deletePost: (id) => apiFetch(`/api/admin/posts/${id}`, { method: "DELETE" }),

  supplyStations: (params = "") => apiFetch(`/api/admin/supply-stations${params}`),
  hideSupplyStation: (id) => apiFetch(`/api/admin/supply-stations/${id}/hide`, { method: "POST" }),
  unhideSupplyStation: (id) =>
    apiFetch(`/api/admin/supply-stations/${id}/unhide`, { method: "POST" }),
  deleteSupplyStation: (id) => apiFetch(`/api/admin/supply-stations/${id}`, { method: "DELETE" }),

  shelters: (params = "") => apiFetch(`/api/admin/shelters${params}`),
  createShelter: (data) =>
    apiFetch("/api/admin/shelters", { method: "POST", body: JSON.stringify(data) }),
  updateShelter: (id, data) =>
    apiFetch(`/api/admin/shelters/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteShelter: (id) => apiFetch(`/api/admin/shelters/${id}`, { method: "DELETE" }),
};
