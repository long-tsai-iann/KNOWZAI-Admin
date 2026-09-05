"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { saveToken, clearToken } from "../../lib/auth";

// 被導回登入頁的原因。原本 AdminGuard 會導到 /login?error=... 但這頁從來沒有
// 讀過這個參數，使用者只會莫名其妙被踢回來、看不到任何說明。
const REDIRECT_REASONS = {
  "not-admin": "這個帳號沒有管理後台的存取權限",
  idle: "閒置過久，已自動登出，請重新登入",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = REDIRECT_REASONS[searchParams.get("error")];
    if (reason) setError(reason);
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      saveToken(token);

      // 登入成功不代表有管理權限，這裡再多查一次自己的 role。
      const me = await api.me();
      if (me?.user?.role !== "ADMIN") {
        clearToken();
        setError("這個帳號沒有管理後台的存取權限");
        return;
      }
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-bold text-orange-700">攏災影管理後台</h1>
        <p className="mb-6 text-sm text-gray-400">僅限管理員帳號登入</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">密碼</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}

// useSearchParams 在 App Router 需要包在 Suspense 內，否則整頁會被強制改成
// 動態渲染（build 時會直接報錯）。
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
