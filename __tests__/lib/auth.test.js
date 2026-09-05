/**
 * @jest-environment jsdom
 */
import { saveToken, loadToken, clearToken } from "../../lib/auth";

describe("lib/auth token storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("loadToken：沒存過任何 token 時回傳 null", () => {
    expect(loadToken()).toBeNull();
  });

  test("saveToken 後 loadToken 拿得回同一個值", () => {
    saveToken("abc123");
    expect(loadToken()).toBe("abc123");
  });

  test("clearToken 後 loadToken 變回 null", () => {
    saveToken("abc123");
    clearToken();
    expect(loadToken()).toBeNull();
  });

  test("saveToken 會覆蓋舊值，不是疊加", () => {
    saveToken("first");
    saveToken("second");
    expect(loadToken()).toBe("second");
  });
});
