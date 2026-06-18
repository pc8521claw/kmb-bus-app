"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const POPULAR_ROUTES = [
  "1", "1A", "2", "6", "6C", "38", "58M", "59A", "68X", "81C", "87D", "98D",
];

export default function Home() {
  const router = useRouter();
  const [route, setRoute] = useState("");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = route.trim();
    if (!trimmed) return;
    router.push(`/route/${encodeURIComponent(trimmed)}/${direction}`);
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            KMB 巴士路線
          </h1>
          <p className="text-stone-900 text-sm sm:text-base">
            九巴路線、站點同預計到站時間
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="route"
              className="block text-sm font-medium text-stone-900 mb-1.5"
            >
              路線號碼
            </label>
            <input
              type="text"
              id="route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="例：58M"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="direction"
              className="block text-sm font-medium text-stone-900 mb-1.5"
            >
              方向
            </label>
            <select
              id="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "outbound" | "inbound")}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base bg-white transition-colors"
            >
              <option value="outbound">去程 (Outbound)</option>
              <option value="inbound">返程 (Inbound)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            查詢路線
          </button>
        </form>

        {/* Popular Routes */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-stone-900 mb-3 text-center">
            熱門路線
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_ROUTES.map((r) => (
              <Link
                key={r}
                href={`/route/${r}/outbound`}
                className="px-3 py-1.5 text-sm rounded-full bg-white border border-stone-200 text-stone-900 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {r}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-stone-900 opacity-50">
          數據來源：九巴開放數據 API
          <br />
          Data source: KMB Open Data API
        </div>
      </div>
    </main>
  );
}
// forced redeploy at Thu Jun 18 15:56:10 HKT 2026
