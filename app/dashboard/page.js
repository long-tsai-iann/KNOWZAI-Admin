"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
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

const OK_COLOR = "#FC961C"; // 品牌橘：正常/顯示中
const FLAG_COLOR = "#DC2626"; // 紅：已隱藏/停權

function DonutStat({ title, okLabel, okValue, flagLabel, flagValue }) {
  const total = okValue + flagValue;
  const data = [
    { name: okLabel, value: okValue },
    { name: flagLabel, value: flagValue },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-gray-600">{title}</div>
      {total === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">
          目前沒有資料
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
              >
                <Cell fill={OK_COLOR} />
                <Cell fill={flagValue > 0 ? FLAG_COLOR : "#E5E7EB"} />
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={24}
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : "讀取失敗"));
  }, []);

  const barData = stats
    ? [
        { name: "使用者", 筆數: stats.userCount },
        { name: "貼文", 筆數: stats.postCount },
        { name: "物資分配站", 筆數: stats.supplyStationCount },
        { name: "避難設施", 筆數: stats.shelterCount },
        { name: "災害警示", 筆數: stats.disasterAlertCount },
        { name: "推播裝置", 筆數: stats.deviceTokenCount },
      ]
    : [];

  return (
    <AdminShell active="dashboard">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">系統狀況儀表板</h1>

      {error && <p className="text-red-600">{error}</p>}
      {!stats && !error && <p className="text-gray-400">載入中…</p>}

      {stats && (
        <>
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

          <h2 className="mb-4 mt-8 text-lg font-bold text-gray-700">內容狀態總覽</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DonutStat
              title="災情貼文"
              okLabel="顯示中"
              okValue={stats.postCount - stats.hiddenPostCount}
              flagLabel="已隱藏"
              flagValue={stats.hiddenPostCount}
            />
            <DonutStat
              title="物資分配站"
              okLabel="顯示中"
              okValue={stats.supplyStationCount - stats.hiddenSupplyStationCount}
              flagLabel="已隱藏"
              flagValue={stats.hiddenSupplyStationCount}
            />
            <DonutStat
              title="使用者"
              okLabel="正常"
              okValue={stats.userCount - stats.bannedUserCount}
              flagLabel="停權中"
              flagValue={stats.bannedUserCount}
            />
          </div>

          <h2 className="mb-4 mt-8 text-lg font-bold text-gray-700">各類資料筆數比較</h2>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="筆數" fill={OK_COLOR} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
