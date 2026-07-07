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
  eta: string | null;
  etaTime: string | null;
  error?: string;
}

function formatEta(etaStr: string | null): { eta: string; etaTime: string | null } {
  if (!etaStr) return { eta: "無班", etaTime: null };
  try {
    let hour: number, minute: number;

    if (etaStr.includes("/")) {
      // Format: 2026/07/07 14:30:00 - parse manually as Hong Kong local time
      const [, timePart] = etaStr.split(" ");
      const [h, m] = timePart.split(":").map(Number);
      hour = h;
      minute = m;
    } else {
      // ISO format
      const d = new Date(etaStr);
      if (isNaN(d.getTime())) return { eta: "無班", etaTime: null };
      hour = d.getHours();
      minute = d.getMinutes();
    }

    // Calculate diff - use tomorrow if time has already passed today
    const now = new Date();
    let etaDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    let diffMs = etaDate.getTime() - now.getTime();
    let diffMin = Math.round(diffMs / 60000);

    // If already passed today, use tomorrow's time
    if (diffMin < 0) {
      etaDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute);
      diffMs = etaDate.getTime() - now.getTime();
      diffMin = Math.round(diffMs / 60000);
    }

    const displayTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    if (diffMin <= 0) return { eta: "即將到站", etaTime: displayTime };
    if (diffMin < 60) return { eta: `${diffMin}分鐘`, etaTime: displayTime };
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return { eta: `${hours}小時${mins}分`, etaTime: displayTime };
  } catch {
    return { eta: "Error", etaTime: null };
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
          const formatted = formatEta(first.eta);
          eta = formatted.eta;
          etaTime = formatted.etaTime;
        } else {
          eta = "無班";
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
          eta: null,
          etaTime: null,
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    })
  );

  return NextResponse.json({ results });
}
