"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadToken, clearToken } from "../lib/auth";
import { api, ApiError } from "../lib/api";

/**
 * 包住所有需要登入的頁面：確認有 token、且該帳號的 role 真的是 ADMIN
 * （呼叫 /api/auth/me 拿最新資料，不只是「有 token 就放行」）。
 * 沒通過就導回 /login。
 */
export default function AdminGuard({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | ok | denied

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = loadToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const me = await api.me();
        if (cancelled) return;
        if (me?.user?.role !== "ADMIN") {
          clearToken();
          router.replace("/login?error=not-admin");
          return;
        }
        setStatus("ok");
      } catch (e) {
        if (cancelled) return;
        router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status !== "ok") {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        驗證登入狀態中…
      </div>
    );
  }

  return children;
}
