"use client";

import AdminShell from "../../components/AdminShell";

function Section({ title, children }) {
  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-orange-700">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <AdminShell active="help">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">使用說明</h1>

      <Section title="這是什麼？怎麼登入？">
        <p>
          這是攏災影 App 的內部管理後台，用來審核使用者上傳的內容、管理帳號、
          維護避難設施資料。跟 App 是完全分開的兩個系統，但共用同一組帳號密碼。
        </p>
        <p>
          用你平常登入 App 的 email/密碼登入就可以了。<strong>但只有被設成
          「管理員」的帳號才能真的進來</strong>——如果登入後被導回登入頁並出現
          錯誤訊息，代表你的帳號還沒有管理員權限，需要請現有的管理員幫你設定
          （見下方「如何取得管理員權限」）。
        </p>
      </Section>

      <Section title="儀表板">
        <p>
          進來後的第一頁，快速看整體狀況：使用者/貼文/物資分配站/避難設施等
          各項數量，以及貼文與物資分配站「顯示中 vs 已隱藏」、使用者「正常 vs
          停權中」的比例圖表。這頁純粹是「看」，不能在這裡做任何操作。
        </p>
      </Section>

      <Section title="災情貼文審核 / 物資分配站審核">
        <p>
          這兩頁邏輯完全一樣，差別只是審核的內容種類不同。上方有三個篩選按鈕：
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>已隱藏（待審核）</strong>：預設看這個。當一則貼文/分配站
            被其他使用者檢舉達 3 次，系統會自動把它隱藏（一般使用者在 App 裡
            看不到），這裡就是用來複查這些被自動隱藏的內容，決定要不要真的
            移除。
          </li>
          <li>
            <strong>顯示中</strong>：目前一般使用者在 App 裡看得到的內容。
          </li>
          <li>
            <strong>全部</strong>：不篩選，全部列出來。
          </li>
        </ul>
        <p>每一則內容右邊有這些按鈕：</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>隱藏</strong>：手動把一則內容藏起來（一般使用者看不到，
            但資料還在，之後可以恢復）。用在你覺得某則內容有問題、但還沒有
            達到自動隱藏的 3 次檢舉門檻的時候。
          </li>
          <li>
            <strong>恢復顯示</strong>：把已隱藏的內容重新顯示出來（不管原本
            是自動隱藏還是手動隱藏）。用在複查後確認內容沒問題、檢舉是誤會
            的時候。
          </li>
          <li>
            <strong>刪除</strong>：
            <span className="font-semibold text-red-600">
              永久刪除，無法復原
            </span>
            ，會跳確認對話框。真的確定內容違規、不會再需要保留時才用這個，
            一般情況建議先用「隱藏」就好。
          </li>
        </ul>
      </Section>

      <Section title="避難設施資料維護">
        <p>
          這裡管理的是「避難收容處所/醫療/消防/警政」等設施的資料庫，跟上面
          的貼文審核無關。可以：
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>新增避難設施</strong>：點右上角「+ 新增避難設施」按鈕，
            填名稱、類型、座標（緯度/經度，可以用 Google 地圖右鍵複製座標）、
            地址、可容納人數、電話。名稱跟座標是必填。
          </li>
          <li>
            <strong>編輯</strong>：點某一筆資料右邊的「編輯」，修改後按「儲存」。
          </li>
          <li>
            <strong>刪除</strong>：永久刪除，會跳確認對話框。
          </li>
          <li>
            上方搜尋框可以用設施名稱關鍵字過濾。
          </li>
        </ul>
      </Section>

      <Section title="使用者管理">
        <p>可以查詢使用者、以及停權/解除停權：</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            上方搜尋框可以用 email 或暱稱關鍵字找人。
          </li>
          <li>
            <strong>停權</strong>：讓這個帳號無法再登入（不管是 App 還是這個
            管理後台）。
            <span className="font-semibold">
              但如果對方剛好還在登入狀態（手機上還留著舊的登入 session），
              停權不會讓他立刻被踢出去
            </span>
            ，最長要等 7 天登入狀態自然過期才會真的生效——這是系統設計上的
            取捨，停權主要是「擋住之後再登入」，不是「立刻斷線」。
          </li>
          <li>
            <strong>解除停權</strong>：讓帳號可以重新登入。
          </li>
          <li>
            管理員沒辦法停權自己的帳號（系統會擋下來），避免不小心把自己鎖在
            外面。
          </li>
        </ul>
      </Section>

      <Section title="如何取得管理員權限？">
        <p>
          <strong>這個網頁本身沒有任何地方可以把一個帳號設成管理員</strong>
          ——這是刻意的設計，避免帳號被盜用後可以自己給自己開權限。要新增一個
          管理員，只能請現有的管理員在後端主機上執行一次指令：
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
          {`cd backend\nnpm run admin:promote -- 對方的email@example.com`}
        </pre>
        <p>執行後對方就可以直接用原本的帳號密碼登入這裡了，不需要重新註冊。</p>
      </Section>

      <Section title="遇到問題怎麼辦？">
        <ul className="ml-5 list-disc space-y-1">
          <li>登入一直失敗、或登入後馬上被導回登入頁：先確認帳號是不是有管理員權限。</li>
          <li>頁面顯示「讀取失敗」：通常是後端服務暫時無法連線，重新整理頁面再試一次。</li>
          <li>其他問題可以直接聯絡開發負責的隊友。</li>
        </ul>
      </Section>
    </AdminShell>
  );
}
