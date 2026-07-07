"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getFavorites, type Company } from "@/lib/favorites";

interface DashboardItem {
  company: Company;
  route: string;
  orig_tc: string;
  dest_tc: string;
  firstStopId: string;
  firstStopName: string;
  bound: "O" | "I";
  eta: string | null;
  etaTime: string | null;
  dirEn: string;
  error?: string;
}

export default function Dashboard() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const favs = getFavorites();
    if (favs.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/route?favorites=${encodeURIComponent(JSON.stringify(favs))}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.results || []);
      } else {
        console.error("Dashboard API error:", res.status);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = async (company: Company, route: string) => {
    setRefreshing(`${company}-${route}`);
    const favs = getFavorites();
    const single = favs.filter((f) => f.company === company && f.route === route);
    try {
      const res = await fetch(
        `/api/dashboard/route?favorites=${encodeURIComponent(JSON.stringify(single))}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((item) => {
            if (item.company === company && item.route === route && data.results?.[0]) {
              return data.results[0];
            }
            return item;
          })
        );
      }
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-stone-900 mb-4">載入中...</div>
        <div className="text-xs text-stone-900 opacity-60">自動每30秒刷新</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-stone-900 text-lg mb-2">暫無收藏路線</div>
        <div className="text-stone-900 text-sm opacity-60 mb-6">
          搜尋路線後，撳 ⭐ 加入收藏
        </div>
        <Link
          href="/"
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          去搜尋
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">收藏路線 ETA</h2>
          <p className="text-xs text-stone-900 opacity-60 mt-1">
            每30秒自動更新 · 顯示第一班
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          {loading ? "更新中..." : "立即更新"}
        </button>
      </div>

      {/* Dashboard List */}
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={`${item.company}-${item.route}`}
            href={`/route/${encodeURIComponent(item.route)}/outbound?company=${item.company}`}
            className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Route Info */}
              <div className="flex items-center gap-3">
                {/* Company dot */}
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: item.company === "KMB" ? "#f59e0b" : "#3b82f6",
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: item.company === "KMB" ? "#fef3c7" : "#dbeafe",
                        color: item.company === "KMB" ? "#92400e" : "#1e40af",
                      }}
                    >
                      {item.company}
                    </span>
                    <span className="text-xl font-bold text-stone-900">
                      {item.route}
                    </span>
                  </div>
                  <div className="text-xs text-stone-900 opacity-70 mt-0.5">
                    {item.orig_tc} → {item.dest_tc}
                  </div>
                </div>
              </div>

              {/* ETA */}
              <div className="text-right">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRefresh(item.company, item.route);
                  }}
                  disabled={refreshing === `${item.company}-${item.route}`}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:text-stone-400 mb-1"
                >
                  {refreshing === `${item.company}-${item.route}` ? "..." : "刷新"}
                </button>
                <div className="text-lg font-bold text-green-600">
                  {item.eta || "—"}
                </div>
                {item.etaTime && (
                  <div className="text-xs text-stone-900 opacity-60">
                    {item.etaTime}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
