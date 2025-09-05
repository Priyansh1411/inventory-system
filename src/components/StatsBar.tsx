"use client";
import { useEffect, useState } from "react";

type Stats = {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStock: number;
};

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/stats", { cache: "no-store" });
    const json = await r.json();
    setStats(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {["Total Products", "Total Stock", "Total Value", "Low Stock"].map((label, i) => {
        const value =
          i === 0 ? stats?.totalProducts ?? 0
          : i === 1 ? stats?.totalStock ?? 0
          : i === 2 ? stats ? Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(stats.totalValue) : "$0.00"
          : stats?.lowStock ?? 0;

        return (
          <div key={label} className="rounded border bg-white px-4 py-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-semibold mt-1">
              {loading ? "…" : value}
            </div>
          </div>
        );
      })}
    </div>
  );
}