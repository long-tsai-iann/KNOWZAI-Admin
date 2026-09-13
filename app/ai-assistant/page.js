"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

// 阿巧 AI 助理的開關（AIMS-03 T-07；AIMS-04 §3 關閉 runbook 的操作介面）。
//
// 關閉後 App 端的 /api/ai/chat 會回 503、阿巧入口隱藏，其他功能不受影響。
// 生效時間最多 15 秒（後端有快取）。每次切換都要填原因，會進稽核日誌
// （AI_CHAT_ENABLE / AI_CHAT_DISABLE）——事後檢討要知道當時為什麼關。

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("zh-TW", { hour12: false });
}

export default function AiAssistantPage() {
  const [status, setStatus] = useState(null); // { enabled, envEnabled, dbEnabled, updatedAt, updatedById }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState("");

  async function load() {
    setLoadError("");
    try {
      setStatus(await api.aiChatStatus());
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "讀取目前狀態失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(nextEnabled) {
    setFormError("");
    setDone("");
    if (!reason.trim()) {
      setFormError("請填入原因（會留在稽核日誌裡）");
      return;
    }
    const verb = nextEnabled ? "開啟" : "關閉";
    if (!window.confirm(`確定要${verb}阿巧？\n\n原因：${reason.trim()}`)) return;

    setSubmitting(true);
    try {
      const res = await api.setAiChatEnabled({ enabled: nextEnabled, reason: reason.trim() });
      setStatus(res);
      setReason("");
      setDone(`已${verb}。App 端最多 15 秒內生效。`);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : `${verb}失敗`);
    } finally {
      setSubmitting(false);
    }
  }

  const enabled = status?.enabled;

  return (
    <AdminShell active="ai-assistant">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">AI 助理（阿巧）開關</h1>
        <p className="mt-1 text-sm text-gray-500">
          發現阿巧回覆有害內容、供應商異常、或金鑰疑似外洩時，在這裡立即關閉。
          關閉後 App 的阿巧入口會隱藏、對話 API 回「暫停服務」，地圖、警示、避難所等
          其他功能<strong>完全不受影響</strong>。生效最多延遲 15 秒。
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400">讀取中…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {status && (
        <div className="mb-6 max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-semibold text-gray-800">目前狀態</h2>
            {enabled ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                服務中
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                已關閉
              </span>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-gray-700">
            <dt className="text-gray-500">後台開關</dt>
            <dd>{status.dbEnabled ? "開" : "關"}</dd>
            <dt className="text-gray-500">部署層開關（AI_CHAT_ENABLED）</dt>
            <dd>
              {status.envEnabled ? "開" : "關"}
              {!status.envEnabled && (
                <span className="ml-2 text-xs text-orange-700">
                  環境變數設成關閉，這裡開了也不會生效，要到 Render 改
                </span>
              )}
            </dd>
            <dt className="text-gray-500">最後變更</dt>
            <dd>
              {fmt(status.updatedAt)}
              {status.updatedById ? `（管理員 #${status.updatedById}）` : ""}
            </dd>
          </dl>
        </div>
      )}

      {status && (
        <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800">{enabled ? "關閉阿巧" : "重新開啟阿巧"}</h2>
          <label className="mb-1 block text-sm text-gray-600" htmlFor="ai-reason">
            原因（必填，會進稽核日誌）
          </label>
          <textarea
            id="ai-reason"
            className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
            rows={3}
            placeholder={
              enabled
                ? "例如：使用者回報阿巧建議前往已淹水的避難所（事件 AI-2026-001）"
                : "例如：prompt 已修正並通過 golden set，恢復服務"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
          {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
          {done && <p className="mb-2 text-sm text-green-700">{done}</p>}
          <button
            type="button"
            onClick={() => toggle(!enabled)}
            disabled={submitting}
            className={
              enabled
                ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                : "rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            }
          >
            {submitting ? "處理中…" : enabled ? "立即關閉阿巧" : "重新開啟阿巧"}
          </button>
          <p className="mt-3 text-xs text-gray-500">
            關閉後請依 AIMS-04 §3 的流程通報與記錄；恢復前要有修正紀錄與 golden set 結果。
          </p>
        </div>
      )}
    </AdminShell>
  );
}
