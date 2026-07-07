// Dashboard API - 獲取監察路線的指定巴士站 ETA
// 輸入: ?watches=JSON.stringify([{company:"KMB",route:"58M",direction:"outbound",stopId:"...",stopName:"屯門站"},...])
// 輸出: [{company, route, direction, stopId, stopName, eta, etaTime},...]

import { NextRequest, NextResponse } from "next/server";
import { fetchEta as fetchKmbEta, fetchRouteInfo as fetchKmbInfo } from "@/lib/kmb-api";
import { fetchCtbEta, fetchCtbRouteInfo } from "@/lib/ctb-api";

type Company = "KMB" | "CTB";
type Direction = "inbound" | "outbound";

interface WatchItem {
  company: Company;
  route: string;
  direction: Direction;
  stopId: string;
  stopName: string;
  dest_tc?: string;
}

interface DashboardResult {
  company: Company;
  route: string;
  direction: Direction;
  stopId: string;
  stopName: string;
  dest_tc: string;
  eta: string | null; // formatted string
  etaTime: string | null; // raw ETA string for client-side formatting
  error?: string;
}

// Server-side: return raw eta string, client formats it (avoids timezone issues on server)
function calcEta(etaStr: string | null): string {
  if (!etaStr) return "無班";
  try {
    const etaDate = new Date(etaStr);
    if (isNaN(etaDate.getTime())) return "無班";
    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "即將到站";
    if (diffMin < 60) return `${diffMin}分鐘`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}小時${m}分`;
  } catch {
    return "Error";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const watchesParam = searchParams.get("watches");

  if (!watchesParam) {
    return NextResponse.json({ error: "Missing watches" }, { status: 400 });
  }

  let watches: WatchItem[];
  try {
    watches = JSON.parse(watchesParam);
  } catch {
    return NextResponse.json({ error: "Invalid watches format" }, { status: 400 });
  }

  const results: DashboardResult[] = await Promise.all(
    watches.map(async (watch): Promise<DashboardResult> => {
      try {
        // Fetch dest_tc if not stored
        let dest_tc = watch.dest_tc || "";
        if (!dest_tc) {
          try {
            if (watch.company === "CTB") {
              const info = await fetchCtbRouteInfo(watch.route);
              dest_tc = info?.dest_tc || "";
            } else {
              const info = await fetchKmbInfo(watch.route, watch.direction);
              dest_tc = info?.dest_tc || "";
            }
          } catch {
            // ignore
          }
        }

        let etaData;
        if (watch.company === "CTB") {
          etaData = await fetchCtbEta(watch.stopId, watch.route);
        } else {
          etaData = await fetchKmbEta(watch.stopId, watch.route, 1);
        }

        let eta: string | null = null;
        let etaTime: string | null = null;

        if (etaData && etaData.length > 0) {
          const first = etaData[0];
          eta = calcEta(first.eta);
          etaTime = first.eta; // raw string for client-side formatting
        } else {
          eta = "無班";
          etaTime = null;
        }

        return {
          company: watch.company,
          route: watch.route,
          direction: watch.direction,
          stopId: watch.stopId,
          stopName: watch.stopName,
          dest_tc,
          eta,
          etaTime,
        };
      } catch (e) {
        return {
          company: watch.company,
          route: watch.route,
          direction: watch.direction,
          stopId: watch.stopId,
          stopName: watch.stopName,
          dest_tc: "",
          eta: "Error",
          etaTime: null,
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    })
  );

  return NextResponse.json({ results });
}
