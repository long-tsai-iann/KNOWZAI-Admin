"use client";

import { clearToken } from "./auth";

// 閒置自動登出（資安審查 M-1）。
//
// 後端已經把管理員的 JWT 效期從 7 天縮短到 12 小時，但「效期」跟「離開座位」
// 是兩件事：管理後台可以刪內容、停權帳號、查閱所有人的 AI 對話紀錄，
// 在共用電腦上開著沒關就走開，風險跟把密碼貼在螢幕上差不多。
//
// 這裡只做前端的閒置判斷（清掉本機 token 並導回登入頁）。它擋的是
// 「有人接手這台電腦」，不是「有人偷走 token」——後者要靠後端的效期。
export const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 分鐘

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "focus"];

/**
 * 開始監看閒置。回傳一個取消函式（給 useEffect 清理用）。
 * @param {() => void} onIdle 閒置逾時要做的事（清 token + 導頁）
 */
export function watchIdle(onIdle, limitMs = IDLE_LIMIT_MS) {
  if (typeof window === "undefined") return () => {};

  let timer = null;

  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      clearToken();
      onIdle();
    }, limitMs);
  };

  for (const evt of ACTIVITY_EVENTS) {
    window.addEventListener(evt, reset, { passive: true });
  }
  // 從別的分頁切回來時也重新計時，避免背景分頁被誤判成閒置
  document.addEventListener("visibilitychange", reset);

  reset();

  return () => {
    if (timer) clearTimeout(timer);
    for (const evt of ACTIVITY_EVENTS) {
      window.removeEventListener(evt, reset);
    }
    document.removeEventListener("visibilitychange", reset);
  };
}
