"use client";

// 任何頁面 render 時炸掉，顯示這個而不是整頁空白／瀏覽器錯誤頁。
// 錯誤訊息印在畫面上，回報問題時可以直接截圖。
export default function Error({ error, reset }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-bold text-gray-800">這一頁出錯了</h1>
      <p className="max-w-lg break-all text-sm text-gray-500">{String(error?.message || error)}</p>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">再試一次</button>
        <a href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">回儀表板</a>
      </div>
      <p className="text-xs text-gray-400">如果一直發生，請把這個畫面截圖給開發者。</p>
    </div>
  );
}
