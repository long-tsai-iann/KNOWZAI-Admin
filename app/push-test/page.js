"use client";

import { useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

const EMPTY_FORM = { title: "", body: "", token: "" };

export default function PushTestPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { attempted, succeeded, results }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSending(true);
    try {
      const payload = {};
      if (form.title.trim()) payload.title = form.title.trim();
      if (form.body.trim()) payload.body = form.body.trim();
      if (form.token.trim()) payload.token = form.token.trim();

      const res = await api.pushTest(payload);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "推播測試失敗");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell active="push-test">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">推播測試</h1>
        <p className="mt-1 text-sm text-gray-500">
          確認 App 的 FCM 推播這條路是否正常、有沒有明顯延遲。不指定裝置 token
          時，會送到目前登入帳號名下所有已註冊的裝置——先在要測試的手機上用這個
          帳號登入過一次 App，該裝置才會有紀錄。
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mb-6 max-w-xl rounded-2xl bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              標題（選填，預設「攏災影・推播測試」）
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="攏災影・推播測試"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              內容（選填）
            </label>
            <input
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="由管理後台觸發的測試推播"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              指定裝置 token（選填——不填就送到自己帳號名下所有裝置；要測特定
              QA 機時可以直接貼那支裝置的 FCM token）
            </label>
            <input
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              placeholder="留空 = 送到自己帳號名下所有裝置"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {sending ? "送出中…" : "送出測試推播"}
          </button>
        </div>
      </form>

      {result && (
        <div className="max-w-xl rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="font-semibold text-gray-800">測試結果</h2>
            <span className="text-sm text-gray-500">
              成功 {result.succeeded} / 共 {result.attempted} 支裝置
            </span>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="py-2 font-medium">裝置 token</th>
                <th className="py-2 font-medium">結果</th>
                <th className="py-2 font-medium">耗時</th>
                <th className="py-2 font-medium">錯誤原因</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs text-gray-600">
                    {r.token}
                  </td>
                  <td className="py-2">
                    {r.ok ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        成功
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        失敗
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">{r.latencyMs} ms</td>
                  <td className="py-2 text-gray-500">{r.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-gray-400">
            耗時是後端呼叫 FCM 送出這則推播花的時間，不是裝置實際收到通知的時間——
            兩者通常只差幾秒內，但無法從後端這裡量到真正送達裝置的那一刻；如果耗時
            正常但手機收不到，通常是裝置端（通知權限、網路、系統休眠限制）的問題，
            不是後端這條路的問題。
          </p>
        </div>
      )}
    </AdminShell>
  );
}
