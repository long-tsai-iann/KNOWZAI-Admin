"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

const EMPTY_FORM = { active: true, reason: "", days: 30 };

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("zh-TW", { hour12: false });
}

export default function EmergencyStatusPage() {
  const [status, setStatus] = useState(null); // { emergencyActive, source, override, autoAlerts }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setLoadError("");
    try {
      const res = await api.emergencyStatus();
      setStatus(res);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "讀取目前狀態失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.reason.trim()) {
      setFormError("請填入這次調整的原因（會留在稽核日誌裡）");
      return;
    }
    setSubmitting(true);
    try {
      await api.createEmergencyOverride({
        active: form.active,
        reason: form.reason.trim(),
        days: Number(form.days),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "建立調整失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOverride() {
    if (!status?.override?.id) return;
    setCancelling(true);
    try {
      await api.cancelEmergencyOverride(status.override.id);
      await load();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "取消調整失敗");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AdminShell active="emergency-status">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">緊急狀態調整</h1>
        <p className="mt-1 text-sm text-gray-500">
          物資分配站是否開放「建立」，預設由後端依地震規模/最大震度自動分級
          （一般 3 小時、規模較大 3 天、重大地震 30 天）。CWA
          的原始資料沒有「這是不是真的重大災害」的旗標，分級只是粗略預設值——
          自動窗口到了但救災/安置還在進行時，可以在這裡延長；自動分級判斷過寬時，
          也可以提早結束。
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400">讀取中…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {status && (
        <div className="mb-6 max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-semibold text-gray-800">目前狀態</h2>
            {status.emergencyActive ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                開放建立中
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                已關閉
              </span>
            )}
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
              判斷依據：{status.source === "override" ? "管理員手動調整" : "自動分級"}
            </span>
          </div>

          {status.source === "override" && status.override && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                <span className="text-gray-400">原因：</span>
                {status.override.reason}
              </p>
              <p className="mt-1">
                <span className="text-gray-400">生效到：</span>
                {fmt(status.override.endsAt)}
              </p>
              <button
                onClick={cancelOverride}
                disabled={cancelling}
                className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                {cancelling ? "取消中…" : "取消這筆調整，回到自動判斷"}
              </button>
            </div>
          )}

          {status.source === "auto" && (
            <div>
              {status.autoAlerts?.length ? (
                <>
                  <p className="mb-2 text-xs text-gray-400">
                    目前仍在自動判斷視窗內的 emergency 級警示：
                  </p>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th className="py-1.5 font-medium">警示</th>
                        <th className="py-1.5 font-medium">地點</th>
                        <th className="py-1.5 font-medium">維持到</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.autoAlerts.map((a) => (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="py-1.5">{a.title}</td>
                          <td className="py-1.5 text-gray-500">{a.location}</td>
                          <td className="py-1.5 text-gray-500">{fmt(a.activeUntil)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  目前沒有 emergency 級警示，也沒有生效中的手動調整。
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-800">新增一筆手動調整</h2>

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">動作</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, active: true })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  form.active
                    ? "bg-green-600 text-white"
                    : "border border-gray-300 text-gray-600"
                }`}
              >
                延長 / 強制開放建立
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, active: false })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  !form.active
                    ? "bg-gray-700 text-white"
                    : "border border-gray-300 text-gray-600"
                }`}
              >
                提早結束 / 強制關閉
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              維持幾天（從現在起算，例如 30 = 開放到 30 天後；填 1 表示只延長 1 天）
            </label>
            <input
              type="number"
              min="0.05"
              max="180"
              step="0.5"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              原因（會留在稽核日誌裡，之後回顧要看得懂）
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="例如：0906 花蓮規模6.8地震，實際勘災確認災損嚴重，延長開放至安置作業結束"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

        <div className="mt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "送出中…" : "送出這筆調整"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
