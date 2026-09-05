"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "./AdminGuard";
import { clearToken } from "../lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "儀表板", key: "dashboard" },
  { href: "/posts", label: "災情貼文審核", key: "posts" },
  { href: "/supply-stations", label: "物資分配站審核", key: "supply-stations" },
  { href: "/shelters", label: "避難設施維護", key: "shelters" },
  { href: "/users", label: "使用者管理", key: "users" },
];

export default function AdminShell({ active, children }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
          <div className="px-5 py-6">
            <div className="text-lg font-bold text-orange-700">攏災影</div>
            <div className="text-xs text-gray-400">管理後台</div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => (
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
          <div className="mt-6 px-3">
            <button
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              登出
            </button>
          </div>
        </aside>
        <main className="flex-1 bg-gray-50 p-8">{children}</main>
      </div>
    </AdminGuard>
  );
}
