"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

const CARDS = [
  { key: "userCount", label: "使用者總數" },
  { key: "bannedUserCount", label: "停權中使用者" },
  { key: "postCount", label: "災情貼文總數" },
  { key: "hiddenPostCount", label: "已隱藏貼文" },
  { key: "supplyStationCount", label: "物資分配站總數" },
  { key: "hiddenSupplyStationCount", label: "已隱藏分配站" },
  { key: "shelterCount", label: "避難設施筆數" },
  { key: "disasterAlertCount", label: "災害警示筆數" },
  { key: "deviceTokenCount", label: "已註冊推播裝置" },
  { key: "pendingFamilyInvites", label: "待同意的家人邀請" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : "讀取失敗"));
  }, []);

  return (
    <AdminShell active="dashboard">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">系統狀況儀表板</h1>

      {error && <p className="text-red-600">{error}</p>}

      {!stats && !error && <p className="text-gray-400">載入中…</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((c) => (
            <div key={c.key} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-400">{c.label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-800">
                {stats[c.key] ?? "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
