/**
 * @jest-environment jsdom
 */
import { apiFetch, ApiError } from "../../lib/api";
import { saveToken, loadToken, clearToken } from "../../lib/auth";

function mockFetchOnce({ status = 200, body = {} } = {}) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = undefined;
});

describe("apiFetch", () => {
  test("有 token 時，request 帶 Authorization: Bearer <token>", async () => {
    saveToken("my-jwt");
    mockFetchOnce({ status: 200, body: { ok: true } });

    await apiFetch("/api/admin/stats");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-jwt");
  });

  test("沒有 token 時，request 不帶 Authorization", async () => {
    mockFetchOnce({ status: 200, body: { ok: true } });

    await apiFetch("/api/auth/login", { method: "POST" });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  test("成功回應：回傳解析後的 JSON body", async () => {
    mockFetchOnce({ status: 200, body: { hello: "world" } });
    const result = await apiFetch("/api/whatever");
    expect(result).toEqual({ hello: "world" });
  });

  test("401：清掉本機 token，並丟出 ApiError(status=401)", async () => {
    saveToken("stale-token");
    mockFetchOnce({ status: 401, body: { error: "Invalid token" } });

    await expect(apiFetch("/api/admin/stats")).rejects.toThrow(ApiError);
    expect(loadToken()).toBeNull();
  });

  test("其他失敗狀態（例如 403）：丟出 ApiError，訊息來自 body.error", async () => {
    mockFetchOnce({ status: 403, body: { error: "Admin access required" } });

    let caught;
    try {
      await apiFetch("/api/admin/stats");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(403);
    expect(caught.message).toBe("Admin access required");
  });

  test("body 沒有 error 欄位時，退回通用訊息（不會炸掉）", async () => {
    mockFetchOnce({ status: 500, body: {} });

    await expect(apiFetch("/api/whatever")).rejects.toThrow(/請求失敗/);
  });
});

// 阿巧 AI 助理開關（AIMS-03 T-07）：切換一定要帶 reason 走 PUT，
// 這是稽核日誌的依據，少了就無法事後檢討「當時為什麼關」。
describe("api.aiChat*", () => {
  test("setAiChatEnabled 用 PUT /api/admin/ai-chat 送 enabled 與 reason", async () => {
    const { api } = require("../../lib/api");
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ enabled: false, envEnabled: true, dbEnabled: false }),
    });
    saveToken("t");
    const res = await api.setAiChatEnabled({ enabled: false, reason: "事件 AI-2026-001" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/ai-chat$/);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ enabled: false, reason: "事件 AI-2026-001" });
    expect(res.enabled).toBe(false);
  });

  test("aiChatStatus 用 GET", async () => {
    const { api } = require("../../lib/api");
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ enabled: true }),
    });
    await api.aiChatStatus();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/ai-chat$/);
    expect(options.method).toBeUndefined();
  });
});
