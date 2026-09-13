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
  postReports: (id) => apiFetch(`/api/admin/posts/${id}/reports`),
  hidePost: (id) => apiFetch(`/api/admin/posts/${id}/hide`, { method: "POST" }),
  unhidePost: (id) => apiFetch(`/api/admin/posts/${id}/unhide`, { method: "POST" }),
  deletePost: (id) => apiFetch(`/api/admin/posts/${id}`, { method: "DELETE" }),

  supplyStations: (params = "") => apiFetch(`/api/admin/supply-stations${params}`),
  supplyStationReports: (id) => apiFetch(`/api/admin/supply-stations/${id}/reports`),
  hideSupplyStation: (id) => apiFetch(`/api/admin/supply-stations/${id}/hide`, { method: "POST" }),
  unhideSupplyStation: (id) =>
    apiFetch(`/api/admin/supply-stations/${id}/unhide`, { method: "POST" }),
  deleteSupplyStation: (id) => apiFetch(`/api/admin/supply-stations/${id}`, { method: "DELETE" }),

  // 稽核日誌（唯讀，見主專案 docs/audit-logging-policy.md）。日誌是 append-only，
  // 後端刻意沒有提供任何修改/刪除的 API，所以這裡也只有 GET。
  adminActionLogs: (params = "") => apiFetch(`/api/admin/logs/admin-actions${params}`),
  authEventLogs: (params = "") => apiFetch(`/api/admin/logs/auth-events${params}`),
  aiInteractionLogs: (params = "") => apiFetch(`/api/admin/logs/ai-interactions${params}`),

  shelters: (params = "") => apiFetch(`/api/admin/shelters${params}`),
  createShelter: (data) =>
    apiFetch("/api/admin/shelters", { method: "POST", body: JSON.stringify(data) }),
  updateShelter: (id, data) =>
    apiFetch(`/api/admin/shelters/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteShelter: (id) => apiFetch(`/api/admin/shelters/${id}`, { method: "DELETE" }),

  // 推播測試：不帶 token 時送到目前管理員帳號名下所有已註冊的裝置；
  // 帶 token 則只送給指定的單一裝置（見 backend/src/routes/admin.js 的說明）。
  pushTest: (data) =>
    apiFetch("/api/admin/push-test", { method: "POST", body: JSON.stringify(data) }),

  // 物資分配站是否開放建立：預設由後端依地震規模/最大震度自動分級，這裡讓
  // 管理員可以覆蓋（延長或提早結束），見 backend/src/services/emergencyGate.js。
  emergencyStatus: () => apiFetch("/api/admin/emergency-status"),
  createEmergencyOverride: (data) =>
    apiFetch("/api/admin/emergency-overrides", { method: "POST", body: JSON.stringify(data) }),
  cancelEmergencyOverride: (id) =>
    apiFetch(`/api/admin/emergency-overrides/${id}`, { method: "DELETE" }),

  // 阿巧 AI 助理開關（AIMS-03 T-07）。關閉後 App 的對話 API 回 503、入口隱藏，
  // 其他功能不受影響；每次切換都要 reason，進稽核日誌。
  aiChatStatus: () => apiFetch("/api/admin/ai-chat"),
  setAiChatEnabled: (data) =>
    apiFetch("/api/admin/ai-chat", { method: "PUT", body: JSON.stringify(data) }),

  // AI 治理儀表板（ISO 42001）。只有 ADMIN + governance 旗標的帳號拿得到，
  // 其他人 403（後端 governanceRequired）。
  governance: {
    overview: () => apiFetch("/api/governance/overview"),
    tasks: (all = false) => apiFetch(`/api/governance/tasks${all ? "?all=1" : ""}`),
    createTask: (data) => apiFetch("/api/governance/tasks", { method: "POST", body: JSON.stringify(data) }),
    updateTask: (id, data) =>
      apiFetch(`/api/governance/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    docs: () => apiFetch("/api/governance/docs"),
    doc: (id, dir) => apiFetch(`/api/governance/docs/${encodeURIComponent(id)}${dir ? `?dir=${dir}` : ""}`),
    approveDoc: (id, data) =>
      apiFetch(`/api/governance/docs/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify(data) }),
    records: () => apiFetch("/api/governance/records"),
    regulations: () => apiFetch("/api/governance/regulations"),
    reviews: () => apiFetch("/api/governance/reviews"),
    sampleReview: (data) => apiFetch("/api/governance/reviews/sample", { method: "POST", body: JSON.stringify(data) }),
    submitReview: (id, data) =>
      apiFetch(`/api/governance/reviews/${id}/submit`, { method: "POST", body: JSON.stringify(data) }),
    // 匯出是 text/markdown，不走 apiFetch 的 JSON 解析
    exportReviewUrl: (id) => `${BASE_URL}/api/governance/reviews/${id}/export`,
  },
};
