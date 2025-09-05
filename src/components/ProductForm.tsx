// src/components/ProductForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductRow } from "@/types/product";

type Props = {
  /** When null => create mode. Otherwise edit the given product. */
  initial: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  category: string;
  price: string; // keep as string for the input, convert to number on submit
  qty: string;   // keep as string for the input, convert to number on submit
  status: "active" | "archived";
};

export default function ProductForm({ initial, onClose, onSaved }: Props) {
  const isEdit = useMemo(() => Boolean(initial?._id), [initial]);

  const [form, setForm] = useState<FormState>({
    name: "",
    category: "",
    price: "",
    qty: "",
    status: "active",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill when editing
  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name ?? "",
        category: initial.category ?? "",
        price: initial.price?.toString() ?? "",
        qty: initial.qty?.toString() ?? "",
        status: (initial.status as "active" | "archived") ?? "active",
      });
    }
  }, [initial]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    const priceNum = Number(form.price);
    const qtyNum = Number(form.qty);

    if (!form.name.trim()) return setError("Name is required.");
    if (!form.category.trim()) return setError("Category is required.");
    if (Number.isNaN(priceNum) || priceNum < 0) return setError("Price must be a non-negative number.");
    if (Number.isNaN(qtyNum) || qtyNum < 0) return setError("Qty must be a non-negative number.");
    if (form.status !== "active" && form.status !== "archived") return setError("Status must be active or archived.");

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: priceNum,
      qty: qtyNum,
      status: form.status,
    };

   try {
  const res = await fetch(
    isEdit ? `/api/products/${initial!._id}` : "/api/products",
    {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Request failed");
  }

  // Get the newly created/updated product from the API
  const created: ProductRow = await res.json();

  // 1) Let the parent update optimistically (if it’s listening)
  onSaved?.();

  // 2) Close the modal immediately (keeps your current UI look)
  onClose?.();

  // 3) Safety net: hard refresh so the list always shows the new item
  // (Use a small timeout to let state changes settle first)
  setTimeout(() => {
    try {
      window.location.reload();
    } catch {}
  }, 0);
} catch (err: any) {
  console.error(err);
  alert(err?.message ?? "Failed to save");
} finally {
  setSaving(false);
}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={() => !saving && onClose()}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2 outline-none focus:ring"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Wireless Mouse"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Category <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2 outline-none focus:ring"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Electronics"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select
                className="w-full rounded border px-3 py-2 outline-none focus:ring"
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as "active" | "archived")
                }
                disabled={saving}
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Price <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded border px-3 py-2 outline-none focus:ring"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Qty <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="1"
                className="w-full rounded border px-3 py-2 outline-none focus:ring"
                value={form.qty}
                onChange={(e) => update("qty", e.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Safely try to parse JSON without throwing on empty bodies */
async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}