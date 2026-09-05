"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

// 三類日誌的定義集中在這裡：要查哪支 API、表格長什麼樣、篩選欄位叫什麼。
// 對應主專案 docs/audit-logging-policy.md 的 §2.1 / §2.2 / §2.3。
const TABS = [
  {
    key: "admin-actions",
    label: "管理員操作",
    retention: "保留 1 年",
    filterLabel: "搜尋操作者 email",
    filterParam: "email",
    fetch: (params) => api.adminActionLogs(params),
    columns: [
      { key: "createdAt", label: "時間", render: (r) => new Date(r.createdAt).toLocaleString("zh-TW") },
      { key: "adminEmail", label: "操作者" },
      { key: "action", label: "動作" },
      { key: "target", label: "目標", render: (r) => `${r.targetType}${r.targetId ? ` #${r.targetId}` : ""}` },
      {
        key: "result",
        label: "結果",
        render: (r) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              r.result === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {r.result === "SUCCESS" ? "成功" : "被擋下"}
          </span>
        ),
      },
      { key: "ip", label: "來源 IP", render: (r) => r.ip || "—" },
      {
        key: "detail",
        label: "備註",
        render: (r) => (r.detail ? JSON.stringify(r.detail) : "—"),
      },
    ],
  },
  {
    key: "auth-events",
    label: "登入事件",
    retention: "保留 1 年",
    filterLabel: "搜尋 email",
    filterParam: "email",
    fetch: (params) => api.authEventLogs(params),
    columns: [
      { key: "createdAt", label: "時間", render: (r) => new Date(r.createdAt).toLocaleString("zh-TW") },
      {
        key: "eventType",
        label: "事件",
        render: (r) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              r.eventType.includes("FAILURE")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {r.eventType}
          </span>
        ),
      },
      { key: "emailAttempted", label: "帳號", render: (r) => r.emailAttempted || "—" },
      { key: "reason", label: "失敗原因", render: (r) => r.reason || "—" },
      { key: "ip", label: "來源 IP", render: (r) => r.ip || "—" },
      {
        key: "userAgent",
        label: "裝置",
        render: (r) => (
          <span className="block max-w-[200px] truncate" title={r.userAgent || ""}>
            {r.userAgent || "—"}
          </span>
        ),
      },
    ],
  },
  {
    key: "ai-interactions",
    label: "AI 對話（阿巧）",
    retention: "含對話原文，只保留 30 天",
    filterLabel: "搜尋使用者 email",
    filterParam: "email",
    fetch: (params) => api.aiInteractionLogs(params),
    columns: [
      { key: "createdAt", label: "時間", render: (r) => new Date(r.createdAt).toLocaleString("zh-TW") },
      { key: "user", label: "使用者", render: (r) => r.user?.nickname || r.user?.email || "—" },
      {
        key: "message",
        label: "使用者訊息",
        render: (r) => (
          <span className="block max-w-[240px] truncate" title={r.message}>
            {r.message}
          </span>
        ),
      },
      {
        key: "reply",
        label: "AI 回覆",
        render: (r) => (
          <span className="block max-w-[240px] truncate" title={r.reply || ""}>
            {r.reply || "—"}
          </span>
        ),
      },
      { key: "model", label: "模型" },
      {
        key: "success",
        label: "結果",
        render: (r) =>
          r.success ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              成功
            </span>
          ) : (
            <span
              className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
              title={r.errorDetail || ""}
            >
              失敗
            </span>
          ),
      },
      { key: "latencyMs", label: "延遲", render: (r) => (r.latencyMs != null ? `${r.latencyMs} ms` : "—") },
    ],
  },
];

export default function LogsPage() {
  const [tabKey, setTabKey] = useState("admin-actions");
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tab = TABS.find((t) => t.key === tabKey);

  async function load(kw = "") {
    setLoading(true);
    setError("");
    try {
      const params = kw
        ? `?${tab.filterParam}=${encodeURIComponent(kw)}&limit=50`
        : "?limit=50";
      const res = await tab.fetch(params);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setKeyword("");
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  return (
    <AdminShell active="logs">
      <h1 className="mb-2 text-2xl font-bold text-gray-800">稽核日誌</h1>
      <p className="mb-6 text-sm text-gray-500">
        系統會自動記錄管理員操作、登入事件與 AI 對話。日誌只能查看，
        任何人（包含管理員）都無法在這裡修改或刪除，逾期後由系統自動清除。
      </p>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabKey(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tabKey === t.key
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(keyword);
        }}
        className="mb-4 flex items-center gap-2"
      >
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={tab.filterLabel}
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          搜尋
        </button>
        <span className="ml-2 text-xs text-gray-400">{tab.retention}</span>
      </form>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-400">載入中…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-400">
              <tr>
                {tab.columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-4 py-3">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={tab.columns.length} className="px-4 py-6 text-center text-gray-400">
                    沒有符合條件的紀錄
                  </td>
                </tr>
              )}
              {logs.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 align-top">
                  {tab.columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-gray-600">
                      {c.render ? c.render(row) : row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400">共 {total} 筆</div>
        </div>
      )}
    </AdminShell>
  );
}
