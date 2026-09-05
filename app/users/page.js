"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load(q = query) {
    setLoading(true);
    setError("");
    try {
      const params = q ? `?query=${encodeURIComponent(q)}&limit=50` : "?limit=50";
      const res = await api.users(params);
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleBan(user) {
    const action = user.banned ? "解除停權" : "停權";
    if (!window.confirm(`確定要${action} ${user.email} 嗎？`)) return;

    setBusyId(user.id);
    try {
      if (user.banned) await api.unbanUser(user.id);
      else await api.banUser(user.id);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "操作失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell active="users">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">使用者管理</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋 email 或暱稱"
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          搜尋
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-400">載入中…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">暱稱</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">檢舉紀點</th>
                <th className="px-4 py-3">建立時間</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">{u.id}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.nickname || "—"}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {u.bannedUntil
                          ? `暫停至 ${new Date(u.bannedUntil).toLocaleDateString("zh-TW")}`
                          : "永久停權"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        正常
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.reportStrikes > 0 ? (
                      <span
                        className="text-xs font-medium text-gray-600"
                        title="因檢舉之後被管理員恢復顯示（視為誤報）而累積的點數，每 5 點觸發一次暫停"
                      >
                        {u.reportStrikes} 點
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleBan(u)}
                      disabled={busyId === u.id}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                        u.banned
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {u.banned ? "解除停權" : "停權"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400">共 {total} 位使用者</div>
        </div>
      )}
    </AdminShell>
  );
}
