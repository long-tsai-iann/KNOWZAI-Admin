/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import AdminGuard from "../../components/AdminGuard";
import { saveToken, loadToken } from "../../lib/auth";
import { api } from "../../lib/api";

const replace = jest.fn();
// 真正的 next/navigation useRouter() 每次 render 都回傳同一個 router 物件參考；
// 這裡故意用同一個物件而不是每次呼叫都 new 一個新的 { replace }，避免
// AdminGuard 的 useEffect（依賴 [router]）誤判「router 變了」而反覆重跑，
// 把 mockResolvedValueOnce 的佇列在測試中途就用完（曾經真的因此讓
// 「role === ADMIN」那個測試被錯誤導去 not-admin 分支）。
const routerMock = { replace };

jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

jest.mock("../../lib/api", () => ({
  api: { me: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

beforeEach(() => {
  window.localStorage.clear();
  replace.mockClear();
  api.me.mockReset();
});

test("沒有 token → 直接導去 /login，不呼叫 api.me()", async () => {
  render(
    <AdminGuard>
      <div>管理員專屬內容</div>
    </AdminGuard>
  );

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  expect(api.me).not.toHaveBeenCalled();
  expect(screen.queryByText("管理員專屬內容")).not.toBeInTheDocument();
});

test("有 token 且 role === 'ADMIN' → 顯示 children，不導頁", async () => {
  saveToken("valid-jwt");
  api.me.mockResolvedValueOnce({ user: { id: 1, role: "ADMIN" } });

  render(
    <AdminGuard>
      <div>管理員專屬內容</div>
    </AdminGuard>
  );

  await waitFor(() =>
    expect(screen.getByText("管理員專屬內容")).toBeInTheDocument()
  );
  expect(replace).not.toHaveBeenCalled();
});

test("有 token 但 role 不是 ADMIN → 清掉 token、導去 /login?error=not-admin", async () => {
  saveToken("valid-jwt-but-not-admin");
  api.me.mockResolvedValueOnce({ user: { id: 2, role: "USER" } });

  render(
    <AdminGuard>
      <div>管理員專屬內容</div>
    </AdminGuard>
  );

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/login?error=not-admin")
  );
  expect(loadToken()).toBeNull();
  expect(screen.queryByText("管理員專屬內容")).not.toBeInTheDocument();
});

test("有 token 但 api.me() 失敗（例如 401/網路錯誤）→ 導去 /login", async () => {
  saveToken("stale-jwt");
  api.me.mockRejectedValueOnce(new Error("401"));

  render(
    <AdminGuard>
      <div>管理員專屬內容</div>
    </AdminGuard>
  );

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  expect(screen.queryByText("管理員專屬內容")).not.toBeInTheDocument();
});
