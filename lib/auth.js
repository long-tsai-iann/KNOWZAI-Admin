"use client";

// JWT 存在 localStorage——這是一個純前端 SPA 式的管理後台，沒有伺服器端 session，
// 跟 Flutter App 用 shared_preferences 存 token 是同一種思路，只是換成瀏覽器的儲存。
const TOKEN_KEY = "admin_token";

export function saveToken(token) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
