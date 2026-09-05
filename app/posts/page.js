"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import ReportsModal from "../../components/ReportsModal";
import { api, ApiError } from "../../lib/api";

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("hidden"); // hidden | visible | all
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reportsTarget, setReportsTarget] = useState(null); // { id, title } | null

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q =
        filter === "hidden" ? "?hidden=true&limit=50" : filter === "visible" ? "?hidden=false&limit=50" : "?limit=50";
      const res = await api.posts(q);
      setPosts(res.posts);
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

  async function run(id, action, label) {
    if (label && !window.confirm(label)) return;
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
    <AdminShell active="posts">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">災情貼文審核</h1>

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
          {posts.length === 0 && <p className="text-gray-400">沒有符合條件的貼文</p>}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{p.title}</span>
                    {p.hidden && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        已隱藏
                      </span>
                    )}
                    {p.reportCount > 0 && (
                      <button
                        onClick={() => setReportsTarget({ id: p.id, title: p.title })}
                        className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200"
                      >
                        被檢舉 {p.reportCount} 次・查看紀錄
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{p.description || "（無描述）"}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    發布者：{p.user?.nickname || p.user?.email || "未知"}｜
                    {new Date(p.postTime).toLocaleString("zh-TW")}｜
                    座標：{p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}
                  </p>
                  {p.imagePath && (
                    <a
                      href={p.imagePath}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-orange-600 underline"
                    >
                      查看照片
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.hidden ? (
                    <button
                      onClick={() => run(p.id, api.unhidePost, null)}
                      disabled={busyId === p.id}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      恢復顯示
                    </button>
                  ) : (
                    <button
                      onClick={() => run(p.id, api.hidePost, null)}
                      disabled={busyId === p.id}
                      className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                    >
                      隱藏
                    </button>
                  )}
                  <button
                    onClick={() => run(p.id, api.deletePost, `確定要永久刪除這則貼文嗎？此動作無法復原。`)}
                    disabled={busyId === p.id}
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

      {reportsTarget && (
        <ReportsModal
          title={reportsTarget.title}
          fetchReports={() => api.postReports(reportsTarget.id)}
          onClose={() => setReportsTarget(null)}
        />
      )}
    </AdminShell>
  );
}
