"use client";

import { useState, useEffect, useRef } from "react";
import type { StopWithName, ServiceType, EtaInfo } from "@/lib/types";

// 取得 platform 對應嘅地圖 URL
// iOS → Apple Maps (native)
// Android → geo: URI (Google Maps app)
// Desktop/Web → Google Maps web
function getMapUrl(lat: string, long: string, name: string): string | null {
  if (!lat || !long) return null;
  const encodedName = encodeURIComponent(name);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPhone|iPad|iPod/.test(ua)) {
    // Apple Maps
    return `https://maps.apple.com/?q=${encodedName}&ll=${lat},${long}`;
  } else if (/Android/.test(ua)) {
    // Google Maps via geo URI (打開 app if installed)
    return `geo:${lat},${long}?q=${lat},${long}(${encodedName})`;
  }
  // Web fallback
  return `https://www.google.com/maps?q=${lat},${long}`;
}

interface StopListProps {
  stops: StopWithName[];
  route: string;
  serviceType: ServiceType;
}

interface EtaState {
  loading: boolean;
  data: EtaInfo[] | null;
  error: string | null;
  lastUpdated: number | null;
}

const REFRESH_INTERVAL_MS = 30_000;  // 30 秒

export default function StopList({ stops, route, serviceType }: StopListProps) {
  const [etaMap, setEtaMap] = useState<Record<string, EtaState>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const etaMapRef = useRef(etaMap);
  etaMapRef.current = etaMap;

  // 單個 stop 撳「到站時間」：fetch + 顯示
  const fetchEta = async (stopId: string) => {
    setEtaMap((prev) => ({
      ...prev,
      [stopId]: {
        loading: true,
        data: prev[stopId]?.data || null,
        error: null,
        lastUpdated: prev[stopId]?.lastUpdated || null,
      },
    }));

    try {
      const res = await fetch(
        `/api/eta?stopId=${stopId}&route=${route}&serviceType=${serviceType}`
      );
      if (!res.ok) throw new Error("ETA 查詢失敗");
      const json = await res.json();
      setEtaMap((prev) => ({
        ...prev,
        [stopId]: { loading: false, data: json.data, error: null, lastUpdated: Date.now() },
      }));
    } catch (e) {
      setEtaMap((prev) => ({
        ...prev,
        [stopId]: {
          loading: false,
          data: prev[stopId]?.data || null,
          error: e instanceof Error ? e.message : "未知錯誤",
          lastUpdated: prev[stopId]?.lastUpdated || null,
        },
      }));
    }
  };

  // Auto-refresh：每 30s 自動更新所有有 data 嘅 stop
  useEffect(() => {
    const refreshAll = async () => {
      // 搵有 data 嘅 stop IDs
      const activeIds = Object.entries(etaMapRef.current)
        .filter(([_, state]) => state.data !== null && !state.loading)
        .map(([id]) => id);
      if (activeIds.length === 0) return;

      setIsRefreshing(true);
      // 並行 refresh（Promise.all）速度更快
      await Promise.all(
        activeIds.map(async (stopId) => {
          try {
            const res = await fetch(
              `/api/eta?stopId=${stopId}&route=${route}&serviceType=${serviceType}`
            );
            if (res.ok) {
              const json = await res.json();
              setEtaMap((prev) => ({
                ...prev,
                [stopId]: {
                  loading: false,
                  data: json.data,
                  error: null,
                  lastUpdated: Date.now(),
                },
              }));
            }
          } catch (e) {
            // 靜默 fail，唔影響 user
          }
        })
      );
      setIsRefreshing(false);
    };

    // 立即跑一次，之後每 30s
    const interval = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [route, serviceType]);

  // Tab 隱藏時暫停 refresh（避免浪費 API calls）
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const handleVisibility = () => {
      if (document.hidden) {
        // tab 隱藏，唔做嘢（interval 仍跑但撳到時 refreshAll 會被使用）
      } else {
        // tab 重新可見，唔需要特別處理
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // 手動 refresh
  const manualRefresh = () => {
    const activeIds = Object.entries(etaMapRef.current)
      .filter(([_, state]) => state.data !== null)
      .map(([id]) => id);
    if (activeIds.length === 0) return;

    setIsRefreshing(true);
    Promise.all(
      activeIds.map(async (stopId) => {
        try {
          const res = await fetch(
            `/api/eta?stopId=${stopId}&route=${route}&serviceType=${serviceType}`
          );
          if (res.ok) {
            const json = await res.json();
            setEtaMap((prev) => ({
              ...prev,
              [stopId]: {
                loading: false,
                data: json.data,
                error: null,
                lastUpdated: Date.now(),
              },
            }));
          }
        } catch (e) {}
      })
    ).finally(() => setIsRefreshing(false));
  };

  const formatEta = (etaIso: string) => {
    const eta = new Date(etaIso);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "即將到站";
    return `${diffMin} 分鐘後`;
  };

  // 檢查有冇任何 ETA data（用嚟判斷要唔要顯示 auto-refresh status bar）
  const hasAnyEta = Object.values(etaMap).some(
    (s) => s.lastUpdated !== null
  );

  return (
    <div>
      {/* Auto-refresh status bar（只有有 ETA 數據先顯示） */}
      {hasAnyEta && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-900">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isRefreshing
                  ? "bg-blue-500 animate-pulse"
                  : "bg-green-500"
              }`}
            />
            <span>
              {isRefreshing ? "更新中..." : "每 30 秒自動更新"}
            </span>
          </div>
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            title="立即更新"
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            {isRefreshing ? "更新中..." : "立即更新"}
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {stops.map((stop) => {
          const state = etaMap[stop.stop];
          const etas = (state?.data?.filter((e) => e.eta) || []).sort(
            (a, b) => new Date(a.eta!).getTime() - new Date(b.eta!).getTime()
          );
          const hasEta = state && !state.loading && !state.error;

          return (
            <li
              key={stop.stop}
              className="border border-stone-100 rounded-lg p-3 hover:border-stone-200 transition-colors"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-stone-900 shrink-0">
                        {stop.seq.padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{stop.name_tc}</div>
                        {stop.name_en && (
                          <div className="text-xs text-stone-900 truncate">
                            {stop.name_en}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchEta(stop.stop)}
                    disabled={state?.loading}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:bg-stone-100 disabled:text-stone-900 rounded-md transition-colors"
                  >
                    {state?.loading ? "..." : "到站時間"}
                  </button>
                </div>
                {/* 車站位置 button (下面對齊) */}
                {stop.lat && stop.long && (() => {
                  const mapUrl = getMapUrl(stop.lat, stop.long, stop.name_tc);
                  return mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-end px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                    >
                      車站位置
                    </a>
                  ) : null;
                })()}
              </div>

              {/* ETA 結果 */}
              {(state?.loading || hasEta || state?.error) && (
                <div className="mt-2 ml-7 text-sm">
                  {state?.loading && !state.data && (
                    <div className="text-stone-900 text-xs">查詢中...</div>
                  )}
                  {state?.error && (
                    <div className="text-red-500 text-xs">{state.error}</div>
                  )}
                  {hasEta && etas.length === 0 && (
                    <div className="text-stone-900 text-xs">暫無 ETA 資料</div>
                  )}
                  {hasEta && etas.length > 0 && (
                    <div className="space-y-1">
                      {etas.map((e, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-stone-900"
                        >
                          <span className="text-green-600 font-medium">
                            🚌 {formatEta(e.eta!)}
                          </span>
                          <span className="text-xs text-stone-900">
                            ({new Date(e.eta!).toLocaleTimeString("zh-HK", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })})
                          </span>
                          {e.rmk_tc && (
                            <span className="text-xs text-stone-900">
                              {e.rmk_tc}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
