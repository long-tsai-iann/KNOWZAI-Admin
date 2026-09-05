"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, ApiError } from "../../lib/api";

const SHELTER_TYPES = ["SHELTER", "MEDICAL", "FIRE", "POLICE", "OTHER"];
const TYPE_LABELS = {
  SHELTER: "避難收容處所",
  MEDICAL: "醫療",
  FIRE: "消防",
  POLICE: "警政",
  OTHER: "其他",
};

const EMPTY_FORM = { name: "", type: "SHELTER", address: "", lat: "", lng: "", capacity: "", phone: "" };

export default function SheltersPage() {
  const [shelters, setShelters] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [editingId, setEditingId] = useState(null); // null=沒開表單, "new"=新增, 數字=編輯該筆
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(q = query) {
    setLoading(true);
    setError("");
    try {
      const params = q ? `?query=${encodeURIComponent(q)}&limit=50` : "?limit=50";
      const res = await api.shelters(params);
      setShelters(res.shelters);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditingId("new");
  }

  function openEdit(s) {
    setForm({
      name: s.name || "",
      type: s.type || "SHELTER",
      address: s.address || "",
      lat: String(s.lat ?? ""),
      lng: String(s.lng ?? ""),
      capacity: s.capacity != null ? String(s.capacity) : "",
      phone: s.phone || "",
    });
    setFormError("");
    setEditingId(s.id);
  }

  function closeForm() {
    setEditingId(null);
  }

  async function submitForm(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        address: form.address || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        phone: form.phone || undefined,
      };
      if (editingId === "new") {
        await api.createShelter(payload);
      } else {
        await api.updateShelter(editingId, payload);
      }
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`確定要刪除「${s.name}」嗎？此動作無法復原。`)) return;
    setBusyId(s.id);
    try {
      await api.deleteShelter(s.id);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "刪除失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell active="shelters">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">避難設施資料維護</h1>
        <button
          onClick={openNew}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          + 新增避難設施
        </button>
      </div>

      {editingId && (
        <form onSubmit={submitForm} className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-800">
            {editingId === "new" ? "新增避難設施" : `編輯 #${editingId}`}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">名稱 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">類型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {SHELTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">緯度 (lat) *</label>
              <input
                required
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">經度 (lng) *</label>
              <input
                required
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">地址</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">可容納人數</label>
              <input
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">電話</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋設施名稱"
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          搜尋
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-400">載入中…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">名稱</th>
                <th className="px-4 py-3">類型</th>
                <th className="px-4 py-3">地址</th>
                <th className="px-4 py-3">座標</th>
                <th className="px-4 py-3">來源</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">{s.id}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[s.type] || s.type}</td>
                  <td className="px-4 py-3">{s.address || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{s.source || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => remove(s)}
                        disabled={busyId === s.id}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400">共 {total} 筆</div>
        </div>
      )}
    </AdminShell>
  );
}
