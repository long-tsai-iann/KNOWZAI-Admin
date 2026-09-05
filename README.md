# 攏災影管理後台（longzaiying-admin）

攏災影 KNOW ZAI 的內部管理後台，使用 **Next.js (App Router) + Tailwind CSS** 建置，
是一個純前端的 SPA（JWT 存在瀏覽器 localStorage，沒有伺服器端 session），直接呼叫
既有的 Express 後端（`long_tsai_iann/backend`）的 `/api/admin/*` API。

刻意跟官方行銷網站（`longzaiying-web`）分開成獨立專案：這裡是內部工具、需要登入，
行銷網站是公開內容，兩者的風險等級與維護者不一樣，不應該共用一個部署。

## 功能

- **儀表板**：使用者/貼文/物資分配站/避難設施/推播裝置等基本統計
- **災情貼文審核**：查看已被檢舉自動隱藏的貼文、手動隱藏/恢復/刪除
- **物資分配站審核**：同上，管理 9.13 新增的物資分配站功能
- **避難設施資料維護**：新增/編輯/刪除 `Shelter` 資料（原本只能靠匯入腳本或直接改資料庫）
- **使用者管理**：查詢使用者、停權/解除停權

## 本機開發

```bash
npm install
cp .env.local.example .env.local
# 編輯 .env.local，填入要接的後端 API 網址
npm run dev
```

開啟 http://localhost:3000

## 第一個管理員帳號怎麼來？

**沒有任何 API 或 UI 可以把自己變成管理員**——這是刻意的設計，避免這變成一個
攻擊者可以打的權限提升漏洞。要讓一個已經註冊過的帳號變成管理員，只能在
**後端** 執行一次性腳本：

```bash
cd long_tsai_iann/backend
npm run admin:promote -- your-email@example.com
```

之後就可以用這個帳號的 email/密碼登入這裡。

## 部署（Vercel）

尚未部署。建議流程：

1. 這個資料夾建一個新的 GitHub repo（例如 `long-tsai-iann/KNOWZAI-admin`），push 上去。
2. 到 [Vercel](https://vercel.com) → New Project → 匯入這個新 repo（可以用同一個
   Vercel 帳號，跟 `longzaiying-web` 是兩個獨立的 Project，不會互相影響）。
3. Framework 會自動辨識為 Next.js。部署前在 Vercel → Settings → Environment
   Variables 加上 `NEXT_PUBLIC_API_BASE_URL`（填後端網址，例如
   `https://long-tsai-iann.onrender.com`）。
4. Deploy。之後每次 push 到 `main` 會自動重新部署（跟 `longzaiying-web` 一樣的流程）。
5. 建議在 Vercel → Settings → Domains 綁一個不容易被公開猜到的子網域
   （例如 `admin.knowzai.app`），不需要對外公開宣傳這個網址。

## 安全性設計筆記

- 後端 `role: ADMIN` 判斷**每次都重新查資料庫**（不信任 JWT 裡的宣告），見
  `backend/src/middleware/admin_required.js` 的註解——拔掉一個人的管理員權限
  會立刻生效，不用等 token 過期。
- 使用者「停權」目前只會擋住**登入**（無法拿到新 token），已經登入的舊 session
  會維持到 JWT 自然過期（最長 7 天）才失效，這是刻意的效能取捨（比照
  `authRequired` middleware 本身不查資料庫的設計），詳見 backend 的
  `AGENTS.md` 9.14。
- `app/layout.js` 設定 `robots: { index: false, follow: false }`，避免被搜尋引擎索引。

## 目錄結構

```
.
├── app/
│   ├── login/page.js          # 登入頁
│   ├── dashboard/page.js      # 儀表板
│   ├── posts/page.js          # 貼文審核
│   ├── supply-stations/page.js
│   ├── shelters/page.js       # 避難設施 CRUD
│   ├── users/page.js          # 使用者管理
│   └── layout.js
├── components/
│   ├── AdminGuard.js   # 檢查登入狀態 + role === ADMIN，沒過就導去 /login
│   └── AdminShell.js   # 側邊欄導覽 + 包住 AdminGuard，各頁面共用
└── lib/
    ├── auth.js   # localStorage token 存取
    └── api.js    # 呼叫後端 API 的統一封裝
```

## 待補（下一步可以做的）

- 目前的刪除/隱藏操作用瀏覽器內建的 `window.confirm`，功能正確但不夠精緻，
  之後可以換成自訂的確認彈窗元件。
- 分頁目前是簡單的 `limit`/`offset`，資料量大了以後可以改成游標分頁。
- 使用者管理目前只有查詢跟停權/解除停權，沒有調整角色（把別人設為/取消 ADMIN）
  的 UI——目前這個操作只能透過後端的 `npm run admin:promote` 腳本執行，這是
  刻意的：管理員權限異動屬於高風險操作，先不開放透過網頁介面進行，避免帳號
  被盜用後直接在後台自我提權或亂授權給別人。
