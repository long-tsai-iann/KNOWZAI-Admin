"use client";

import { useEffect, useState } from "react";
import { ApiError } from "../lib/api";

/**
 * 顯示某一則內容的檢舉紀錄（誰檢舉的、原因、時間）。
 * `fetchReports` 是一個回傳 { reports: [...] } 的 async function（例如
 * `() => api.postReports(id)`），由呼叫端決定要打哪個 endpoint。
 */
export default function ReportsModal({ title, fetchReports, onClose }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports()
      .then((res) => setReports(res.reports))
      .catch((e) => setError(e instanceof ApiError ? e.message : "讀取失敗"));
  }, [fetchReports]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">檢舉紀錄</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-100"
          >
            關閉
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-500">{title}</p>

        {error && <p className="text-red-600">{error}</p>}
        {!reports && !error && <p className="text-gray-400">載入中…</p>}

        {reports && reports.length === 0 && (
          <p className="text-sm text-gray-400">目前沒有任何檢舉紀錄。</p>
        )}

        {reports && reports.length > 0 && (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                <div className="font-medium text-gray-700">
                  {r.user?.nickname || r.user?.email || "未知使用者"}
                </div>
                <div className="mt-1 text-gray-500">
                  {r.reason ? `原因：${r.reason}` : "（沒有填寫原因）"}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleString("zh-TW")}
                  {r.strikeApplied && "・已計入檢舉人的紀點"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
