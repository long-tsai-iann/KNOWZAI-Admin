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
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-800">AI 助理（阿巧）開關</h1>
          <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-xs font-semibold text-purple-600">AIMS · 緊急遏制</span>
        </div>
        <p className="text-sm text-gray-500">
          這是阿巧的「拔插頭」。關閉後 App 的阿巧入口會隱藏、對話 API 回「暫停服務」，
          地圖、警示、避難所等其他功能<strong>完全不受影響</strong>。生效最多延遲 15 秒。
        </p>
      </div>

      {status && (
        <div className={`mb-6 flex max-w-2xl items-center gap-4 rounded-2xl border-2 p-5 ${enabled ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
          <div className={`text-4xl ${enabled ? "" : "grayscale"}`}>{enabled ? "🟢" : "🔴"}</div>
          <div>
            <div className={`text-xl font-bold ${enabled ? "text-green-800" : "text-red-800"}`}>
              {enabled ? "阿巧目前：服務中" : "阿巧目前：已關閉"}
            </div>
            <div className="text-sm text-gray-600">
              {enabled ? "使用者可以正常對話。" : "使用者看到「暫停服務中，其他功能不受影響」。"}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-gray-800">什麼時候該關？</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>🔴 阿巧給了<strong>可能危及安全</strong>的建議（錯的避難方式、勸人不撤離、錯的緊急電話、編造地點）</li>
          <li>🔴 GROQ 金鑰疑似外洩</li>
          <li>🟠 供應商（Groq）持續異常、備援也失敗，回覆變成一直出錯</li>
          <li>🟠 月覆核發現「有害」評分且原因未查明</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          原則（AIMS-04 §2）：<strong>先關再報</strong>。任一技術負責人都可以關，不用先開會；關了之後 30 分鐘內通知 AI 管理負責人，並在治理儀表板開事件紀錄。
          恢復前要有修正紀錄與 golden set 結果。
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400">讀取中…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {status && (
        <div className="mb-6 max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800">技術細節（兩層開關）</h2>

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
