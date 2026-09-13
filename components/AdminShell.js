"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard, { useMe } from "./AdminGuard";
import { clearToken } from "../lib/auth";

// 功能選單：實際做事的頁面
const NAV_ITEMS = [
  { href: "/dashboard", label: "儀表板", key: "dashboard" },
  { href: "/posts", label: "災情貼文審核", key: "posts" },
  { href: "/supply-stations", label: "物資分配站審核", key: "supply-stations" },
  { href: "/shelters", label: "避難設施維護", key: "shelters" },
  { href: "/users", label: "使用者管理", key: "users" },
  { href: "/logs", label: "稽核日誌", key: "logs" },
  { href: "/push-test", label: "推播測試", key: "push-test" },
  { href: "/emergency-status", label: "緊急狀態調整", key: "emergency-status" },
  { href: "/ai-assistant", label: "AI 助理開關", key: "ai-assistant" },
];

// 治理選單只給合規負責人（ADMIN + governance 旗標）看；一般管理員連入口都沒有。
// 後端 /api/governance/* 另有 governanceRequired 擋著，藏選單只是不誤導。
function ShellInner({ active, children, onLogout }) {
  const me = useMe();
  const navItems = me?.governance
    ? [...NAV_ITEMS, { href: "/governance", label: "AI 治理儀表板", key: "governance" }]
    : NAV_ITEMS;

  return (
      <div className="flex h-screen overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <div className="px-5 py-6">
            <div className="text-lg font-bold text-orange-700">攏災影</div>
            <div className="text-xs text-gray-400">管理後台</div>
          </div>

          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active === item.key
                    ? "bg-orange-100 text-orange-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 撐開中間空白，把下面這區推到最底部 */}
          <div className="flex-1" />

          {/* 使用說明/登出：跟功能選單分開，加一條分隔線區隔 */}
          <div className="flex flex-col gap-1 border-t border-gray-100 px-3 py-3">
            <Link
              href="/help"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active === "help"
                  ? "bg-orange-100 text-orange-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              使用說明
            </Link>
            <button
              onClick={onLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              登出
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
  );
}

export default function AdminShell({ active, children }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <AdminGuard>
      <ShellInner active={active} onLogout={handleLogout}>
        {children}
      </ShellInner>
    </AdminGuard>
  );
}
