"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

const SUPPLY_LABELS = {
  Water: "飲水",
  Food: "食物",
  Medicine: "藥品",
  Blanket: "毛毯/寢具",
  Clothes: "衣物",
  Other: "其他",
};

export default function SupplyStationsPage() {
  const [stations, setStations] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("hidden");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q =
        filter === "hidden" ? "?hidden=true&limit=50" : filter === "visible" ? "?hidden=false&limit=50" : "?limit=50";
      const res = await api.supplyStations(q);
      setStations(res.stations);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function run(id, action, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    try {
      await action(id);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "操作失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell active="supply-stations">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">物資分配站審核</h1>

      <div className="mb-4 flex gap-2">
        {[
          { key: "hidden", label: "已隱藏（待審核）" },
          { key: "visible", label: "顯示中" },
          { key: "all", label: "全部" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f.key
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-400">載入中…</p>}

      {!loading && (
        <div className="space-y-3">
          {stations.length === 0 && <p className="text-gray-400">沒有符合條件的分配站</p>}
          {stations.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{s.title}</span>
                    {s.hidden && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        已隱藏
                      </span>
                    )}
                    {s.reportCount > 0 && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        被檢舉 {s.reportCount} 次
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {(s.supplyTypes || []).map((t) => SUPPLY_LABELS[t] || t).join("、")}
                    {s.itemsNote ? `（${s.itemsNote}）` : ""}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    發布者：{s.user?.nickname || s.user?.email || "未知"}｜
                    地點：{s.address || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}｜
                    時間：{new Date(s.startTime).toLocaleString("zh-TW")}
                    {s.endTime ? ` ~ ${new Date(s.endTime).toLocaleString("zh-TW")}` : ""}
                  </p>
                  {(s.scope || s.targetAudience) && (
                    <p className="mt-1 text-xs text-gray-400">
                      {s.scope && `發放範圍：${s.scope}　`}
                      {s.targetAudience && `對象：${s.targetAudience}`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {s.hidden ? (
                    <button
                      onClick={() => run(s.id, api.unhideSupplyStation, null)}
                      disabled={busyId === s.id}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      恢復顯示
                    </button>
                  ) : (
                    <button
                      onClick={() => run(s.id, api.hideSupplyStation, null)}
                      disabled={busyId === s.id}
                      className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                    >
                      隱藏
                    </button>
                  )}
                  <button
                    onClick={() =>
                      run(s.id, api.deleteSupplyStation, "確定要永久刪除這個分配站嗎？此動作無法復原。")
                    }
                    disabled={busyId === s.id}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400">共 {total} 筆</p>
        </div>
      )}
    </AdminShell>
  );
}
