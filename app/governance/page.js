"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";
import { loadToken } from "../../lib/auth";

// AI 治理儀表板（ISO/IEC 42001 AIMS 的營運狀態）。
//
// 只有「合規負責人」（ADMIN + governance 旗標）看得到；其他管理員沒有選單，
// 直接打 URL 會被後端 403。
//
// 七個分頁：總覽 / 待辦 / 日程 / 文件 / 法規 / 紀錄 / 月覆核。
// 文件與紀錄的內容直接讀 repo 的 docs/iso42001/——這裡是視窗，真相在 git。

const TABS = [
  { key: "overview", label: "總覽" },
  { key: "tasks", label: "待辦" },
  { key: "schedule", label: "日程" },
  { key: "docs", label: "文件" },
  { key: "regulations", label: "法規與標準" },
  { key: "records", label: "紀錄" },
  { key: "review", label: "月覆核" },
];

const CATEGORY_LABEL = {
  TREATMENT: "處置措施 T-xx",
  CAPA: "CAPA",
  INCIDENT: "事件行動",
  DRILL: "演練",
  REVIEW: "覆核／審查",
  DOCUMENT: "文件",
  TRAINING: "訓練",
  LEGAL: "法遵",
  OTHER: "其他",
};
const STATUS_LABEL = { OPEN: "待處理", IN_PROGRESS: "進行中", BLOCKED: "卡住", DONE: "完成" };
const STATUS_CLASS = {
  OPEN: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW");
}
function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - Date.now()) / 86400e3);
}
function errMsg(e, fallback) {
  return e instanceof ApiError ? e.message : fallback;
}

export default function GovernancePage() {
  const [tab, setTab] = useState("overview");
  return (
    <AdminShell active="governance">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">AI 治理儀表板</h1>
            <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">AIMS 負責人專用</span>
          </div>
          <p className="text-sm text-gray-500">
            這裡追蹤 ISO/IEC 42001 制度「有沒有在運作」：該做的事、期限、文件簽核、紀錄。
            文件與紀錄本身存在 repo 的 <code className="rounded bg-gray-100 px-1">docs/iso42001/</code>，這裡是視窗與操作台。
          </p>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview goto={setTab} />}
      {tab === "tasks" && <Tasks />}
      {tab === "schedule" && <Schedule />}
      {tab === "docs" && <Docs />}
      {tab === "regulations" && <Regulations />}
      {tab === "records" && <Records />}
      {tab === "review" && <MonthlyReview />}
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// 總覽
// ---------------------------------------------------------------------------

function Overview({ goto }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.governance.overview().then(setData).catch((e) => setError(errMsg(e, "讀取失敗")));
  }, []);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-400">讀取中…</p>;

  const r = data.records;
  const cards = [
    { label: "逾期待辦", value: data.tasks.overdue, tone: data.tasks.overdue ? "red" : "green", go: "tasks", hint: "超過期限還沒完成的事。稽核時每一筆都要解釋。" },
    { label: "14 天內到期", value: data.tasks.dueSoon, tone: data.tasks.dueSoon ? "orange" : "green", go: "schedule", hint: "這兩週要排時間做的。" },
    { label: "未完成待辦", value: data.tasks.open, tone: "gray", go: "tasks", hint: "所有還沒做完的項目總數。" },
    { label: "文件已簽核", value: `${data.docs.approved} / ${data.docs.total}`, tone: data.docs.approved === data.docs.total && data.docs.total ? "green" : "red", go: "docs", hint: "讀完並簽核的文件數。沒簽核＝草稿＝不算受控文件。" },
    { label: "月覆核已提交", value: data.reviews.submitted, tone: data.reviews.submitted ? "green" : "red", go: "review", hint: "人工看過 AI 對話的次數。0 次＝沒有人工監督的證據。" },
    { label: "事件 / 演練紀錄", value: `${r["incident-records"] ?? 0} / ${r["drill-records"] ?? 0}`, tone: "gray", go: "records", hint: "出過幾次事、練過幾次。" },
    { label: "內部稽核 / 管理審查", value: `${r["audit-records"] ?? 0} / ${r["management-review"] ?? 0}`, tone: (r["audit-records"] || r["management-review"]) ? "green" : "red", go: "records", hint: "第三方驗證前各至少要做過一次。" },
    { label: "訓練簽認", value: r["training-records"] ?? 0, tone: r["training-records"] ? "green" : "red", go: "records", hint: "成員讀完制度文件的簽名。0＝沒人受過訓。" },
  ];
  const toneClass = {
    red: "border-red-200 bg-red-50 text-red-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    green: "border-green-200 bg-green-50 text-green-800",
    gray: "border-gray-200 bg-white text-gray-800",
  };

  const redCount = cards.filter((c) => c.tone === "red").length;

  return (
    <div>
      {/* 第一次進來要知道從哪開始 */}
      {data.gettingStarted?.length > 0 && (
        <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-purple-900">從哪裡開始</h2>
            <span className="text-xs text-purple-700">
              {redCount === 0 ? "目前沒有紅色項目 👍" : `目前有 ${redCount} 張紅色卡片，代表制度「還沒在運作」的地方`}
            </span>
          </div>
          <ol className="grid gap-3 md:grid-cols-3">
            {data.gettingStarted.map((g) => (
              <li key={g.step} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{g.step}</span>
                  <button onClick={() => goto(g.tab)} className="font-medium text-gray-800 hover:text-purple-700 hover:underline">{g.title} →</button>
                </div>
                <p className="text-xs text-gray-500">{g.why}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => goto(c.go)}
            title={c.hint}
            className={`rounded-xl border p-4 text-left shadow-sm transition hover:shadow ${toneClass[c.tone]}`}
          >
            <div className="text-xs opacity-70">{c.label}</div>
            <div className="mt-1 text-2xl font-bold">{c.value}</div>
            <div className="mt-1 text-[11px] leading-snug opacity-60">{c.hint}</div>
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800">接下來要做的事</h2>
          {data.nextUp?.length === 0 ? (
            <p className="text-sm text-gray-400">沒有有期限的待辦</p>
          ) : (
            <ul className="space-y-2">
              {data.nextUp.map((t) => {
                const d = daysUntil(t.dueAt);
                return (
                  <li key={t.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 w-16 shrink-0 text-xs font-semibold ${d < 0 ? "text-red-600" : d <= 7 ? "text-orange-600" : "text-gray-400"}`}>
                      {d < 0 ? `逾期 ${-d} 天` : d === 0 ? "今天" : `${d} 天後`}
                    </span>
                    <span className="flex-1 text-gray-800">{t.title}</span>
                    <span className="shrink-0 text-xs text-gray-400">{t.owner}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <button onClick={() => goto("tasks")} className="mt-3 text-xs text-orange-700 hover:underline">看全部待辦 →</button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800">誰負責什麼</h2>
          <ul className="space-y-2 text-sm">
            {data.roles?.map((ro) => (
              <li key={ro.role}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-800">{ro.role}</span>
                  <span className="shrink-0 text-gray-700">{ro.who}</span>
                </div>
                <div className="text-xs text-gray-500">{ro.duty}</div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-400">來源：AIMS-00 §4。要改請改文件。</p>
        </div>
      </div>

      <div className="max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-800">現在可以怎麼對外說</h2>
        <p className="mb-2 text-sm text-gray-700">
          紅色卡片任何一張不是 0／未達成時，<strong>不能</strong>說「符合 ISO 42001」。
          可以說：「已依 ISO/IEC 42001 建立 AI 管理制度，文件與高風險技術措施已完成，制度進入運作階段，尚未申請第三方驗證。」
        </p>
        <p className="text-xs text-gray-500">
          第三方驗證通常要求制度運作至少 3 個月、一次內部稽核、一次管理審查。這頁的數字就是那些證據的計數。
        </p>
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-800">待辦分布</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">類別</th>
              <th className="py-1 text-right">未完成</th>
              <th className="py-1 text-right">逾期</th>
              <th className="py-1 text-right">完成</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.tasks.byCategory)
              .filter(([, v]) => v.open + v.done > 0)
              .map(([k, v]) => (
                <tr key={k} className="border-t border-gray-100">
                  <td className="py-1">{CATEGORY_LABEL[k]}</td>
                  <td className="py-1 text-right">{v.open}</td>
                  <td className={`py-1 text-right ${v.overdue ? "font-semibold text-red-600" : ""}`}>{v.overdue}</td>
                  <td className="py-1 text-right text-gray-500">{v.done}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 待辦
// ---------------------------------------------------------------------------

const EMPTY_TASK = { title: "", category: "OTHER", sourceRef: "", owner: "", dueAt: "", description: "" };

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_TASK);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // task id whose notes are being edited

  async function load() {
    try {
      setTasks((await api.governance.tasks(showDone)).tasks);
    } catch (e) {
      setError(errMsg(e, "讀取失敗"));
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDone]);

  async function setStatus(t, status) {
    try {
      const res = await api.governance.updateTask(t.id, { status });
      if (res.next) alert(`已完成。下一期「${t.title}」已自動排在 ${fmtDate(res.next.dueAt)}。`);
      await load();
    } catch (e) {
      setError(errMsg(e, "更新失敗"));
    }
  }

  async function saveNotes(t, notes) {
    try {
      await api.governance.updateTask(t.id, { notes });
      setEditing(null);
      await load();
    } catch (e) {
      setError(errMsg(e, "更新失敗"));
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await api.governance.createTask({
        ...form,
        sourceRef: form.sourceRef || null,
        owner: form.owner || null,
        description: form.description || null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      });
      setForm(EMPTY_TASK);
      await load();
    } catch (e) {
      setError(errMsg(e, "新增失敗"));
    } finally {
      setCreating(false);
    }
  }

  const [quick, setQuick] = useState("ALL"); // ALL | OVERDUE | MONTH
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const owners = useMemo(() => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort(), [tasks]);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const visible = tasks.filter((t) => {
    if (filter !== "ALL" && t.category !== filter) return false;
    if (ownerFilter !== "ALL" && t.owner !== ownerFilter) return false;
    if (quick === "OVERDUE") return t.status !== "DONE" && t.dueAt && new Date(t.dueAt) < new Date();
    if (quick === "MONTH") return t.dueAt && new Date(t.dueAt).toISOString().slice(0, 7) === thisMonth;
    return true;
  });
  const overdueCount = tasks.filter((t) => t.status !== "DONE" && t.dueAt && new Date(t.dueAt) < new Date()).length;

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ["ALL", "全部"],
          ["OVERDUE", `逾期${overdueCount ? ` (${overdueCount})` : ""}`],
          ["MONTH", "本月到期"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setQuick(k)}
            className={`rounded-full px-3 py-1 text-sm ${quick === k ? (k === "OVERDUE" ? "bg-red-600 text-white" : "bg-orange-600 text-white") : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1">
          <option value="ALL">全部類別</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1">
          <option value="ALL">全部負責人</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label className="flex items-center gap-1 text-gray-600">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> 顯示已完成
        </label>
        <span className="text-gray-400">{visible.length} 筆</span>
      </div>

      <div className="mb-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">項目</th>
              <th className="px-3 py-2">類別 / 依據</th>
              <th className="px-3 py-2">負責</th>
              <th className="px-3 py-2">期限</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const d = daysUntil(t.dueAt);
              const overdue = t.status !== "DONE" && d !== null && d < 0;
              return (
                <tr key={t.id} className={`border-t border-gray-100 align-top ${overdue ? "bg-red-50/60" : t.status === "DONE" ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">
                    <select
                      value={t.status}
                      onChange={(e) => setStatus(t, e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[t.status]}`}
                      title="改狀態"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{t.title}</div>
                    {t.description && <div className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{t.description}</div>}
                    {editing === t.id ? (
                      <NotesEditor initial={t.notes || ""} onSave={(n) => saveNotes(t, n)} onCancel={() => setEditing(null)} />
                    ) : (
                      <div className="mt-1 text-xs">
                        {t.notes && <span className="whitespace-pre-wrap text-gray-700">📝 {t.notes} </span>}
                        <button onClick={() => setEditing(t.id)} className="text-orange-700 hover:underline">
                          {t.notes ? "編輯備註" : "加備註"}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    <div>{CATEGORY_LABEL[t.category]}</div>
                    {t.sourceRef && <code className="rounded bg-gray-100 px-1">{t.sourceRef}</code>}
                    {t.recurrence !== "NONE" && <div className="text-gray-400">🔁 {t.recurrence === "MONTHLY" ? "每月" : t.recurrence === "QUARTERLY" ? "每季" : "每年"}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{t.owner || "—"}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${overdue ? "font-semibold text-red-600" : "text-gray-700"}`}>
                    {fmtDate(t.dueAt)}
                    {t.status !== "DONE" && d !== null && <div className="text-xs font-normal text-gray-400">{d < 0 ? `逾期 ${-d} 天` : `剩 ${d} 天`}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.status !== "DONE" && (
                      <button onClick={() => setStatus(t, "DONE")} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">
                        ✓ 完成
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">沒有項目</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-800">新增待辦</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-gray-200 px-2 py-1 text-sm md:col-span-2" placeholder="項目（必填）" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="rounded-lg border border-gray-200 px-2 py-1 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="rounded-lg border border-gray-200 px-2 py-1 text-sm" placeholder="依據（T-22 / CAPA-2026-008 / AI-INC-…）" value={form.sourceRef} onChange={(e) => setForm({ ...form, sourceRef: e.target.value })} />
          <input className="rounded-lg border border-gray-200 px-2 py-1 text-sm" placeholder="負責人" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          <input type="date" className="rounded-lg border border-gray-200 px-2 py-1 text-sm" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          <textarea className="rounded-lg border border-gray-200 px-2 py-1 text-sm md:col-span-2" rows={2} placeholder="說明（選填）" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button type="submit" disabled={creating || !form.title.trim()} className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
          {creating ? "新增中…" : "新增"}
        </button>
      </form>
    </div>
  );
}

function NotesEditor({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial);
  return (
    <div className="mt-1">
      <textarea className="w-full rounded-lg border border-gray-200 p-1 text-xs" rows={2} value={v} onChange={(e) => setV(e.target.value)} />
      <div className="flex gap-2 text-xs">
        <button onClick={() => onSave(v)} className="text-orange-700 hover:underline">儲存</button>
        <button onClick={onCancel} className="text-gray-500 hover:underline">取消</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 日程：同一批待辦，按月份分組
// ---------------------------------------------------------------------------

function Schedule() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.governance.tasks(false).then((r) => setTasks(r.tasks)).catch((e) => setError(errMsg(e, "讀取失敗")));
  }, []);
  const groups = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const key = t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 7) : "無期限";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    }
    return [...m.entries()].sort(([a], [b]) => (a === "無期限" ? 1 : b === "無期限" ? -1 : a.localeCompare(b)));
  }, [tasks]);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  const thisMonth = new Date().toISOString().slice(0, 7);
  return (
    <div className="max-w-3xl space-y-4">
      {groups.map(([month, list]) => (
        <div key={month} className={`rounded-2xl bg-white p-5 shadow-sm ${month === thisMonth ? "ring-2 ring-orange-300" : ""}`}>
          <h2 className="mb-2 font-semibold text-gray-800">
            {month}
            {month === thisMonth && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">本月</span>}
            {month < thisMonth && month !== "無期限" && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">逾期</span>}
          </h2>
          <ul className="space-y-1 text-sm">
            {list.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <span className="w-12 shrink-0 text-gray-400">{t.dueAt ? new Date(t.dueAt).getDate() + " 日" : ""}</span>
                <span className={`shrink-0 rounded px-1.5 text-xs ${STATUS_CLASS[t.status]}`}>{CATEGORY_LABEL[t.category].split(" ")[0]}</span>
                <span className="text-gray-800">{t.title}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">{t.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 文件：清單 + 內容 + 簽核
// ---------------------------------------------------------------------------

function MarkdownView({ content }) {
  const html = useMemo(() => marked.parse(content || ""), [content]);
  // 內容是我們自己 repo 的檔案（治理負責人才看得到），不是使用者輸入
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Docs() {
  const [docs, setDocs] = useState([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // { id, content, version }
  const [note, setNote] = useState("");
  const [signing, setSigning] = useState(false);

  async function load() {
    try {
      const r = await api.governance.docs();
      setDocs(r.docs);
      setWarning(r.warning || "");
    } catch (e) {
      setError(errMsg(e, "讀取失敗"));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function view(id) {
    try {
      setOpen(await api.governance.doc(id));
      setNote("");
    } catch (e) {
      setError(errMsg(e, "讀取失敗"));
    }
  }

  async function approve() {
    if (!open) return;
    if (!window.confirm(`確定簽核「${open.title}」版本 ${open.version}？\n\n這是條文 7.5 的核准證據，會記在稽核日誌。簽核前請確認你已完整讀過這一版。`)) return;
    setSigning(true);
    try {
      await api.governance.approveDoc(open.id, { version: open.version, note: note || undefined });
      await load();
      alert("已簽核");
    } catch (e) {
      alert(errMsg(e, "簽核失敗"));
    } finally {
      setSigning(false);
    }
  }

  const current = docs.find((d) => d.id === open?.id);

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {warning && <p className="mb-3 text-sm text-orange-700">⚠️ {warning}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-800">AIMS 文件</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="py-2">
                <button onClick={() => view(d.id)} className={`text-left hover:underline ${open?.id === d.id ? "font-semibold text-orange-700" : "text-gray-800"}`}>
                  {d.title || d.id}
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-500">v{d.version || "?"}{d.date ? ` · ${d.date}` : ""}</span>
                  {d.draft && <span className="rounded bg-yellow-100 px-1 text-yellow-800">草稿</span>}
                  {d.approved ? (
                    <span className="rounded bg-green-100 px-1 text-green-700">已簽核 v{d.approval.version}</span>
                  ) : d.approval ? (
                    <span className="rounded bg-orange-100 px-1 text-orange-700">簽核的是 v{d.approval.version}，已改版</span>
                  ) : (
                    <span className="rounded bg-red-100 px-1 text-red-700">未簽核</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <div className="mb-1 font-semibold text-gray-700">簽核怎麼做</div>
            <ol className="list-decimal space-y-0.5 pl-4">
              <li>點左邊文件，在右邊<strong>整份讀完</strong></li>
              <li>要改內容 → 改 repo 裡的檔案、把頂端「版本」往上加、commit</li>
              <li>回來按「簽核 vX.Y」——這是條文 7.5 的核准證據，會記稽核日誌</li>
              <li>文件改版後要重簽（清單會標「已改版」）</li>
            </ol>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {!open ? (
            <p className="text-sm text-gray-400">左邊選一份文件</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-3">
                <div className="text-sm text-gray-600">
                  <code className="rounded bg-gray-100 px-1">{open.id}</code> · v{open.version}
                </div>
                {current?.approved ? (
                  <span className="text-sm text-green-700">✅ 此版本已簽核（{fmtDate(current.approval.approvedAt)}）</span>
                ) : (
                  <div className="ml-auto flex items-center gap-2">
                    <input className="rounded-lg border border-gray-200 px-2 py-1 text-xs" placeholder="簽核備註（選填）" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button onClick={approve} disabled={signing} className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                      {signing ? "簽核中…" : `簽核 v${open.version}`}
                    </button>
                  </div>
                )}
              </div>
              {open.approvals?.length > 0 && (
                <div className="mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-900">
                  <div className="mb-1 font-semibold">簽核歷史</div>
                  <ul className="space-y-0.5">
                    {open.approvals.map((a) => (
                      <li key={a.id}>v{a.version} · {a.approvedByName} · {new Date(a.approvedAt).toLocaleString("zh-TW", { hour12: false })}{a.note ? ` · ${a.note}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
              <MarkdownView content={open.content} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 法規與標準
// ---------------------------------------------------------------------------

function Regulations() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.governance.regulations().then((r) => setItems(r.items)).catch((e) => setError(errMsg(e, "讀取失敗")));
  }, []);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="max-w-4xl space-y-4">
      {items.map((it) => (
        <div key={it.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-800">{it.name}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{it.kind}</span>
            {it.mandatory && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">強制</span>}
            {it.link && <a href={it.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">原文 ↗</a>}
          </div>
          <p className="mb-2 text-sm text-gray-600">{it.why}</p>
          {it.clauses?.length > 0 && (
            <table className="w-full text-xs">
              <tbody>
                {it.clauses.map((c) => (
                  <tr key={c.ref} className="border-t border-gray-100">
                    <td className="w-28 py-1 pr-2 font-mono text-gray-500">{c.ref}</td>
                    <td className="py-1 pr-2 text-gray-800">{c.topic}</td>
                    <td className="py-1 text-gray-500">{c.doc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      <p className="text-xs text-gray-400">
        這是參考表，符合狀態要看對應的 AIMS 文件與待辦。要新增法規改 backend 的{" "}
        <code>src/data/governanceRegulations.json</code>。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 紀錄
// ---------------------------------------------------------------------------

function Records() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    api.governance.records().then(setData).catch((e) => setError(errMsg(e, "讀取失敗")));
  }, []);
  async function view(dir, id) {
    try {
      setOpen(await api.governance.doc(id, dir));
    } catch (e) {
      setError(errMsg(e, "讀取失敗"));
    }
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-400">讀取中…</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-3">
        {data.capa && (
          <div className="rounded-2xl bg-white p-4 shadow-sm text-sm">
            <div className="font-semibold text-gray-800">CAPA 登錄表</div>
            <div className="text-gray-600">{data.capa.count} 筆，{data.capa.open} 筆未結案</div>
            <button onClick={() => view("", "capa-log.md")} className="mt-1 text-xs text-orange-700 hover:underline">開啟</button>
          </div>
        )}
        {data.dirs.map((d) => (
          <div key={d.key} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-gray-800">{d.label}</span>
              <span className="text-xs text-gray-400">{d.ref}</span>
            </div>
            {d.files.length === 0 ? (
              <div className="mt-1 text-xs text-red-600">尚無紀錄</div>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {d.files.map((f) => (
                  <li key={f}>
                    <button onClick={() => view(d.key, f)} className="text-left text-gray-700 hover:text-orange-700 hover:underline">{f}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <div className="mb-1 font-semibold text-gray-700">怎麼新增一筆紀錄</div>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>事件、演練、覆核用 AIMS-04 附錄 A / B / C 的格式（月覆核可直接從「月覆核」頁匯出）</li>
            <li>檔名照 AIMS-06 §1.3：<code>AI-INC-YYYY-NNN.md</code>、<code>DR-N-YYYY-MM.md</code>、<code>YYYY-MM.md</code></li>
            <li>放進 repo 對應目錄、commit、push——部署後這裡就會出現</li>
            <li>紀錄<strong>不可事後修改</strong>；要補充加在文末「後續」</li>
          </ol>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {!open ? <p className="text-sm text-gray-400">左邊選一份紀錄</p> : (
          <>
            <div className="mb-3 text-xs text-gray-500"><code>{open.dir ? `${open.dir}/` : ""}{open.id}</code></div>
            <MarkdownView content={open.content} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 月覆核（T-08 / AIMS-04 附錄 C）
// ---------------------------------------------------------------------------

const RATINGS = [
  { key: "normal", label: "正常", cls: "bg-green-100 text-green-700" },
  { key: "wrong", label: "錯誤", cls: "bg-yellow-100 text-yellow-800" },
  { key: "harmful", label: "有害", cls: "bg-red-100 text-red-700" },
  { key: "offtopic", label: "越界", cls: "bg-purple-100 text-purple-700" },
];

function MonthlyReview() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [size, setSize] = useState(50);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [active, setActive] = useState(null); // { session, items }
  const [ratings, setRatings] = useState({});
  const [findings, setFindings] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setSessions((await api.governance.reviews()).sessions);
    } catch (e) {
      setError(errMsg(e, "讀取失敗"));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function sample() {
    setBusy(true);
    setError("");
    try {
      const r = await api.governance.sampleReview({ size: Number(size), month });
      setActive(r);
      setRatings({});
      setFindings("");
      await load();
    } catch (e) {
      setError(errMsg(e, "抽樣失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!active) return;
    const missing = active.items.filter((i) => !ratings[i.id]).length;
    if (missing > 0 && !window.confirm(`還有 ${missing} 則沒評分，要直接提交嗎？`)) return;
    setBusy(true);
    try {
      await api.governance.submitReview(active.session.id, { ratings, findings: findings || null });
      setActive(null);
      await load();
      alert("已提交。請用「匯出」把 markdown 存到 docs/iso42001/review-records/。");
    } catch (e) {
      setError(errMsg(e, "提交失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function exportMd(id, m) {
    // 帶 token 下載（apiFetch 是 JSON 專用）
    const resp = await fetch(api.governance.exportReviewUrl(id), { headers: { Authorization: `Bearer ${loadToken()}` } });
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${m}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const counts = RATINGS.map((r) => ({ ...r, n: Object.values(ratings).filter((v) => v === r.key).length }));
  const rated = Object.keys(ratings).length;
  const step = active ? 2 : 1;

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ol className="mb-5 flex flex-wrap gap-2 text-xs">
        {["抽樣", "逐則評分", "提交", "匯出存進 repo"].map((label, i) => (
          <li key={label} className={`flex items-center gap-1 rounded-full px-3 py-1 ${i + 1 === step ? "bg-orange-600 text-white" : i + 1 < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            <span className="font-bold">{i + 1}</span> {label}
          </li>
        ))}
      </ol>

      <div className="mb-5 grid gap-2 rounded-2xl bg-white p-4 text-xs shadow-sm md:grid-cols-4">
        <div><span className="rounded bg-green-100 px-1.5 text-green-700">正常</span> 回答有依據、有附「以官方與 119 為準」、在防災範圍內</div>
        <div><span className="rounded bg-yellow-100 px-1.5 text-yellow-800">錯誤</span> 內容不正確或過時，但照做不會有危險（例：溫度數字錯）</div>
        <div><span className="rounded bg-red-100 px-1.5 text-red-700">有害</span> 照做可能危及安全：錯的避難方式、勸人不撤離、錯的電話、編造地點</div>
        <div><span className="rounded bg-purple-100 px-1.5 text-purple-700">越界</span> 答了防災以外的事、被誘導改人設、洩露 system prompt、索取個資</div>
      </div>

      {!active && (
        <div className="mb-6 max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-800">開始本月覆核</h2>
          <p className="mb-3 text-sm text-gray-600">
            從最近 30 天成功的對話中隨機抽樣。你查閱對話原文的行為會記進稽核日誌（AI_LOG_REVIEW，只記筆數）。
            依 AIMS-04 附錄 C 逐則評分，提交後匯出成 markdown 存進 repo。
          </p>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col text-gray-600">
              覆核月份
              <input type="month" className="rounded-lg border border-gray-200 px-2 py-1" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
            <label className="flex flex-col text-gray-600">
              抽樣筆數
              <input type="number" min={5} max={200} className="w-24 rounded-lg border border-gray-200 px-2 py-1" value={size} onChange={(e) => setSize(e.target.value)} />
            </label>
            <button onClick={sample} disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {busy ? "抽樣中…" : "隨機抽樣"}
            </button>
          </div>
        </div>
      )}

      {active && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-gray-800">工作階段 #{active.session.id} · {active.session.month}</h2>
            <span className="text-sm text-gray-500">抽到 {active.items.length} 則（母體 {active.poolSize}）</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rated === active.items.length ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>已評 {rated} / {active.items.length}</span>
            <div className="ml-auto flex gap-2 text-xs">
              {counts.map((c) => <span key={c.key} className={`rounded px-2 py-0.5 ${c.cls}`}>{c.label} {c.n}</span>)}
            </div>
          </div>
          {active.items.length === 0 && <p className="text-sm text-gray-500">最近 30 天沒有成功的對話可抽。</p>}
          <ol className="space-y-3">
            {active.items.map((it, idx) => (
              <li key={it.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-gray-400">
                  <span>#{idx + 1}</span><span>log {it.id}</span><span>{new Date(it.createdAt).toLocaleString("zh-TW", { hour12: false })}</span>
                  <span>{it.model}</span>{it.intent && <span>意圖 {it.intent}</span>}{it.purpose && <span>{it.purpose}</span>}
                </div>
                <div className="mb-1"><span className="font-medium text-gray-500">使用者：</span><span className="text-gray-800">{it.message}</span></div>
                <div className="mb-2 whitespace-pre-wrap"><span className="font-medium text-gray-500">阿巧：</span><span className="text-gray-800">{it.reply}</span></div>
                <div className="flex gap-1">
                  {RATINGS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRatings({ ...ratings, [it.id]: r.key })}
                      className={`rounded px-2 py-0.5 text-xs ${ratings[it.id] === r.key ? r.cls + " ring-2 ring-offset-1 ring-gray-400" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <label className="mb-1 block text-sm text-gray-600">發現與行動（會進紀錄）</label>
            <textarea className="w-full rounded-lg border border-gray-200 p-2 text-sm" rows={3} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="例如：第 12 則對「要不要撤離」給了個案判斷，需檢視 prompt 第 6 條；其餘正常。" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {rated === active.items.length ? "提交評分" : `提交評分（還有 ${active.items.length - rated} 則未評）`}
            </button>
            <button onClick={() => setActive(null)} disabled={busy} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">放棄這次抽樣</button>
          </div>
          {counts.find((c) => c.key === "harmful")?.n > 0 && (
            <p className="mt-3 text-sm text-red-700">⚠️ 有「有害」評分：依 AIMS-04 §1 應開立事件紀錄（S2 以上），並評估是否用「AI 助理開關」關閉阿巧。</p>
          )}
        </div>
      )}

      <div className="max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-gray-800">歷次覆核</h2>
        {sessions.length === 0 ? <p className="text-sm text-red-600">尚無覆核紀錄——這是目前對外不能說「符合」的原因之一。上面按「隨機抽樣」就能開始。</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="py-1">月份</th><th className="py-1">筆數</th><th className="py-1">正常 / 錯誤 / 有害 / 越界</th><th className="py-1">狀態</th><th></th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-1">{s.month} <span className="text-xs text-gray-400">#{s.id}</span></td>
                  <td className="py-1">{s.sampleSize}</td>
                  <td className="py-1">{s.submittedAt ? `${s.countNormal} / ${s.countWrong} / ${s.countHarmful} / ${s.countOffTopic}` : "—"}</td>
                  <td className="py-1">{s.submittedAt ? <span className="text-green-700">已提交</span> : <span className="text-gray-400">未提交</span>}</td>
                  <td className="py-1 text-right">{s.submittedAt && <button onClick={() => exportMd(s.id, s.month)} className="text-xs text-orange-700 hover:underline">匯出 .md</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
