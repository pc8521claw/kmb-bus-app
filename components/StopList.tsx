"use client";

import { useState } from "react";
import type { StopWithName, ServiceType, EtaInfo } from "@/lib/types";

interface StopListProps {
  stops: StopWithName[];
  route: string;
  serviceType: ServiceType;
}

interface EtaState {
  loading: boolean;
  data: EtaInfo[] | null;
  error: string | null;
}

export default function StopList({ stops, route, serviceType }: StopListProps) {
  const [etaMap, setEtaMap] = useState<Record<string, EtaState>>({});

  const fetchEta = async (stopId: string) => {
    // 設為 loading
    setEtaMap((prev) => ({
      ...prev,
      [stopId]: { loading: true, data: prev[stopId]?.data || null, error: null },
    }));

    try {
      const res = await fetch(`/api/eta?stopId=${stopId}&route=${route}&serviceType=${serviceType}`);
      if (!res.ok) throw new Error("ETA 查詢失敗");
      const json = await res.json();
      setEtaMap((prev) => ({
        ...prev,
        [stopId]: { loading: false, data: json.data, error: null },
      }));
    } catch (e) {
      setEtaMap((prev) => ({
        ...prev,
        [stopId]: {
          loading: false,
          data: prev[stopId]?.data || null,
          error: e instanceof Error ? e.message : "未知錯誤",
        },
      }));
    }
  };

  const formatEta = (etaIso: string) => {
    const eta = new Date(etaIso);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "即將到站";
    return `${diffMin} 分鐘後`;
  };

  return (
    <ol className="space-y-2">
      {stops.map((stop) => {
        const state = etaMap[stop.stop];
        const etas = state?.data?.filter((e) => e.eta) || [];
        const hasEta = state && !state.loading && !state.error;

        return (
          <li
            key={stop.stop}
            className="border border-stone-100 rounded-lg p-3 hover:border-stone-200 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-mono text-stone-400 shrink-0">
                    {stop.seq.padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{stop.name_tc}</div>
                    {stop.name_en && (
                      <div className="text-xs text-stone-500 truncate">
                        {stop.name_en}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => fetchEta(stop.stop)}
                disabled={state?.loading}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:bg-stone-100 disabled:text-stone-400 rounded-md transition-colors"
              >
                {state?.loading ? "..." : "查 ETA"}
              </button>
            </div>

            {/* ETA 結果 */}
            {(state?.loading || hasEta || state?.error) && (
              <div className="mt-2 ml-7 text-sm">
                {state?.loading && (
                  <div className="text-stone-400 text-xs">查詢中...</div>
                )}
                {state?.error && (
                  <div className="text-red-500 text-xs">{state.error}</div>
                )}
                {hasEta && etas.length === 0 && (
                  <div className="text-stone-400 text-xs">暫無 ETA 資料</div>
                )}
                {hasEta && etas.length > 0 && (
                  <div className="space-y-1">
                    {etas.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-stone-700"
                      >
                        <span className="text-green-600 font-medium">
                          🚌 {formatEta(e.eta!)}
                        </span>
                        <span className="text-xs text-stone-400">
                          ({new Date(e.eta!).toLocaleTimeString("zh-HK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })})
                        </span>
                        {e.rmk_tc && (
                          <span className="text-xs text-stone-500">
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
  );
}
