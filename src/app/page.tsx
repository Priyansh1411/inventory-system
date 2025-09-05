"use client";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductForm from "@/components/ProductForm";

/* ---------------- Types ---------------- */
type ProductRow = {
  _id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  status: "active" | "archived";
  createdAt: string; // ISO
};

type ApiList = {
  items: ProductRow[];
  page: number;
  pageSize: number;
  total: number;
};

/* ---------------- Helpers ---------------- */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function Pill({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: "slate" | "green" | "blue" | "rose";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    blue: "bg-sky-100 text-sky-700 ring-sky-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${map[color]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon = "📦",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function HomePage() {
  useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = "/login";
    },
  });

  // ---------- server data ----------
  const [data, setData] = useState<ApiList>({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // ---------- filters (APPLIED) ----------
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "archived">("all");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");

  const [sortBy, setSortBy] = useState<"createdAt" | "price" | "qty" | "name">(
    "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ---------- filter DRAFTS (type freely, fetch only on Apply) ----------
  const [qDraft, setQDraft] = useState(q);
  const [statusDraft, setStatusDraft] =
    useState<"all" | "active" | "archived">(status);
  const [minDraft, setMinDraft] = useState(min);
  const [maxDraft, setMaxDraft] = useState(max);

  // ---------- modal ----------
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  // ---------- selection for bulk actions ----------
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (min.trim() !== "" && !Number.isNaN(Number(min)))
      params.set("min", String(Number(min)));
    if (max.trim() !== "" && !Number.isNaN(Number(max)))
      params.set("max", String(Number(max)));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const r = await fetch(`/api/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!r.ok) {
      setData({ items: [], page: 1, pageSize, total: 0 });
      setSelected(new Set());
      return;
    }
    const json = (await r.json()) as ApiList;
    setData(json);

    // remove selections that aren't on the current page
    setSelected((prev) => {
      const pageIds = new Set(json.items.map((i) => i._id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (pageIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [q, status, min, max, sortBy, sortDir, page]);

  useEffect(() => {
    load();
  }, [load]);

  const { totalProducts, totalStock, totalValue, lowStock } = useMemo(() => {
    const items = data.items;
    const tp = data.total;
    const ts = items.reduce((s, p) => s + p.qty, 0);
    const tv = items.reduce((s, p) => s + p.qty * p.price, 0);
    const low = items.filter((p) => p.qty < 20).length;
    return { totalProducts: tp, totalStock: ts, totalValue: tv, lowStock: low };
  }, [data]);

  // ---------- actions ----------
  const onClickAdd = () => {
    setEditing(null);
    setOpenForm(true);
  };

  const exportCsv = useCallback(async () => {
    // Use APPLIED filters (not drafts)
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (min.trim() !== "" && !Number.isNaN(Number(min)))
      params.set("min", String(Number(min)));
    if (max.trim() !== "" && !Number.isNaN(Number(max)))
      params.set("max", String(Number(max)));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", "1");
    params.set("pageSize", "100000");

    const r = await fetch(`/api/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!r.ok) {
      alert("Export failed.");
      return;
    }

    const json = (await r.json()) as {
      items: Array<{
        name: string;
        category: string;
        price: number;
        qty: number;
        status: string;
        createdAt: string;
      }>;
    };

    const header = ["Name", "Category", "Price", "Qty", "Status", "Created"];
    const escape = (s: string) =>
      s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;

    const rows = json.items.map((p) =>
      [
        escape(p.name),
        escape(p.category),
        String(p.price),
        String(p.qty),
        p.status,
        new Date(p.createdAt).toISOString(),
      ].join(",")
    );

    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [q, status, min, max, sortBy, sortDir]);

  const onClickEdit = (row: ProductRow) => {
    setEditing(row);
    setOpenForm(true);
  };

  const onSaved = (created?: ProductRow) => {
    setOpenForm(false);
    setEditing(null);

    if (created) {
      setData((prev) => {
        const idx = prev.items.findIndex((i) => i._id === created._id);
        let items: ProductRow[];

        if (idx >= 0) {
          items = [...prev.items];
          items[idx] = created;
        } else {
          items = [created, ...prev.items];
        }

        return {
          ...prev,
          items: items.slice(0, prev.pageSize),
          total: idx >= 0 ? prev.total : prev.total + 1,
        };
      });
    }

    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  const clearFilters = () => {
    // reset drafts AND applied filters
    setQ("");
    setStatus("all");
    setMin("");
    setMax("");
    setQDraft("");
    setStatusDraft("all");
    setMinDraft("");
    setMaxDraft("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  };

  // ---------- bulk selection helpers ----------
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allOnPageIds = useMemo(() => data.items.map((i) => i._id), [data.items]);

  const allOnPageSelected =
    allOnPageIds.length > 0 &&
    allOnPageIds.every((id) => selected.has(id));

  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        allOnPageIds.forEach((id) => next.delete(id));
      } else {
        allOnPageIds.forEach((id) => next.add(id));
      }
      return next;
    });

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected item(s)?`)) return;

    const r = await fetch("/api/products/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    if (!r.ok) {
      alert("Bulk delete failed");
      return;
    }
    setSelected(new Set());
    load();
  };

  const bulkSetStatus = async (status: "active" | "archived") => {
    if (selected.size === 0) return;

    const r = await fetch("/api/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    if (!r.ok) {
      alert("Bulk update failed");
      return;
    }
    setSelected(new Set());
    load();
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header / Hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 z-0 h-64 w-64 rounded-full bg-sky-100 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 z-0 h-64 w-64 rounded-full bg-emerald-100 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Inventory Manager
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your products with style.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded border border-rose-700 bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm 
               hover:bg-rose-700 active:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              Sign out
            </button>

            <button
              onClick={exportCsv}
              className="rounded border border-slate-900 px-3 py-2 text-sm font-medium text-slate-900 bg-white 
               hover:bg-slate-50 active:bg-slate-100 shadow-sm"
            >
              Export CSV
            </button>

            <button
              onClick={onClickAdd}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={totalProducts}
            hint="Items in inventory"
            icon="📦"
          />
          <StatCard
            title="Total Stock"
            value={totalStock}
            hint="Units available"
            icon="📊"
          />
          <StatCard
            title="Total Value"
            value={inr.format(totalValue)}
            hint="Inventory worth"
            icon="💰"
          />
          <StatCard
            title="Low Stock"
            value={lowStock}
            hint="Items below 20 units"
            icon="⚠️"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <input
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                placeholder="Search name/category"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>
            </div>
          </div>

          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            placeholder="Min ₹"
            className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            placeholder="Max ₹"
            className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />

          <button
            onClick={() => {
              // move drafts -> applied, then fetch
              setQ(qDraft);
              setStatus(statusDraft);
              setMin(minDraft);
              setMax(maxDraft);
              setPage(1);
            }}
            className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:scale-[0.99]"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Clear
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="createdAt">Created</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="qty">Qty</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk action bar (appears when rows are selected) */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="text-slate-700">
            {selected.size} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => bulkSetStatus("active")}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark active
            </button>
            <button
              onClick={() => bulkSetStatus("archived")}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark archived
            </button>
            <button
              onClick={bulkDelete}
              className="rounded bg-rose-600 px-3 py-1.5 font-semibold text-white hover:brightness-110"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-6 card overflow-x-auto">
  <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-700"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                />
              </th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.items.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-slate-500"
                  colSpan={8}
                >
                  No products yet.
                </td>
              </tr>
            ) : (
              data.items.map((p) => {
                const checked = selected.has(p._id);
                return (
                  <tr
                    key={p._id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-slate-700"
                        checked={checked}
                        onChange={() => toggleRow(p._id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-3">
                      <Pill color="blue">{p.category}</Pill>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
  {inr.format(p.price)}
</td>
<td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
  {p.qty}
</td>
                    <td className="px-4 py-3">
                      {p.status === "active" ? (
                        <Pill color="green">active</Pill>
                      ) : (
                        <Pill color="slate">archived</Pill>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
  {new Date(p.createdAt).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}
</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onClickEdit(p)}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(p._id)}
                          className="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <div className="text-slate-600">
          Page <strong>{data.page}</strong> /{" "}
          <strong>{Math.max(1, Math.ceil(data.total / data.pageSize))}</strong>
        </div>
        <div className="flex gap-2">
          <button
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
          >
            Prev
          </button>
          <button
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={data.page * data.pageSize >= data.total}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal w/ ProductForm */}
      {openForm && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenForm(false)}
          />
          <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
            <div className="card mt-16 w-full max-w-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 className="text-base font-semibold">
                  {editing ? "Edit Product" : "Add Product"}
                </h3>
                <button
                  onClick={() => {
                    setOpenForm(false);
                    setEditing(null);
                  }}
                  className="cursor-pointer rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <ProductForm
                  initial={editing}
                  onSaved={onSaved}
                  onClose={() => {
                    setOpenForm(false);
                    setEditing(null);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}