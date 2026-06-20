"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getFavorites } from "@/lib/favorites";
import { getRecent, type RecentSearch } from "@/lib/recent";

export default function Home() {
  const router = useRouter();
  const [route, setRoute] = useState("");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load favorites + recent from localStorage
  useEffect(() => {
    setFavorites(getFavorites());
    setRecent(getRecent());
  }, []);

  const handleRouteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 強制轉大楷
    setRoute(e.target.value.toUpperCase());
    if (error) setError("");  // 清除錯誤
  };

  const clearRoute = () => {
    setRoute("");
    setError("");
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = route.trim();
    if (!trimmed) return;

    setError("");
    setChecking(true);

    try {
      // 檢查路線是否存在
      const res = await fetch(
        `/api/check-route?route=${encodeURIComponent(trimmed)}&direction=${direction}`
      );
      if (res.status === 404) {
        setError("錯誤的路線號碼");
        setChecking(false);
        return;
      }
      if (!res.ok) {
        setError("查詢失敗，請稍後再試");
        setChecking(false);
        return;
      }
      // 路線存在，導航
      router.push(`/route/${encodeURIComponent(trimmed)}/${direction}`);
    } catch (e) {
      setError("網絡錯誤，請稍後再試");
      setChecking(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            巴士路線搜尋
          </h1>
          <p className="text-stone-900 text-sm sm:text-base">
            巴士路線、車站及到站時間
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4"
          noValidate
        >
          <div>
            <label
              htmlFor="route"
              className="block text-sm font-medium text-stone-900 mb-1.5"
            >
              路線號碼
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="route"
                value={route}
                onChange={handleRouteChange}
                placeholder="例：58M"
                required
                autoFocus
                onInvalid={(e) => e.preventDefault()}
                className={`w-full px-4 py-2.5 rounded-lg border outline-none text-base transition-colors ${
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                } ${route ? "pr-10" : ""}`}
              />
              {route && (
                <button
                  type="button"
                  onClick={clearRoute}
                  title="清除"
                  aria-label="清除輸入"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-stone-900 opacity-50 hover:opacity-100 hover:bg-stone-100 transition-all"
                >
                  ×
                </button>
              )}
            </div>
            {error && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}
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
              <option value="outbound">出市區 (Outbound)</option>
              <option value="inbound">入郊區 (Inbound)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={checking}
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-stone-400"
          >
            {checking ? "查詢中..." : "查詢路線"}
          </button>
        </form>

        {/* 常用路線 (Favorites) */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-stone-900 mb-3 text-center">
            常用路線
          </h2>
          {favorites.length === 0 ? (
            <p className="text-center text-xs text-stone-900 opacity-50">
              撳路線結果頁面嘅 ⭐ 加到常用路線
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {favorites.map((r) => (
                <Link
                  key={r}
                  href={`/route/${encodeURIComponent(r)}/outbound`}
                  className="px-3 py-1.5 text-sm rounded-full bg-white border border-stone-200 text-stone-900 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {r}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 最近搜尋 (Recent Searches) */}
        <div className="mt-6">
          <h2 className="text-sm font-medium text-stone-900 mb-3 text-center">
            最近搜尋
          </h2>
          {recent.length === 0 ? (
            <p className="text-center text-xs text-stone-900 opacity-50">
              搜尋過嘅路線會出現喺度
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {recent.map((entry) => (
                <Link
                  key={`${entry.route}-${entry.direction}-${entry.timestamp}`}
                  href={`/route/${encodeURIComponent(entry.route)}/${entry.direction}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-white border border-stone-200 text-stone-900 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  title={`${entry.direction === "outbound" ? "出市區" : "入郊區"}`}
                >
                  <span>{entry.route}</span>
                  <span className="text-xs text-stone-900 opacity-60">
                    {entry.direction === "outbound" ? "出" : "入"}
                  </span>
                </Link>
              ))}
            </div>
          )}
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
