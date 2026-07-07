// Dashboard API - 獲取收藏路線的第一班 ETA
// 輸入: ?favorites=JSON.stringify([{company:"KMB",route:"58M"},...])
// 輸出: [{company, route, orig_tc, dest_tc, firstStopId, firstStopName, eta, etaTime, dirEn},...]

import { NextRequest, NextResponse } from "next/server";
import { fetchRouteStops as fetchKmbStops, fetchRouteInfo as fetchKmbInfo, fetchStopInfo as fetchKmbStopInfo } from "@/lib/kmb-api";
import { fetchCtbRouteInfo, fetchCtbRouteStops, fetchCtbStopInfo } from "@/lib/ctb-api";
import { fetchEta as fetchKmbEta } from "@/lib/kmb-api";
import { fetchCtbEta } from "@/lib/ctb-api";
import type { Direction } from "@/lib/types";

type Company = "KMB" | "CTB";

interface FavoriteItem {
  company: Company;
  route: string;
}

interface DashboardItem {
  company: Company;
  route: string;
  orig_tc: string;
  dest_tc: string;
  firstStopId: string;
  firstStopName: string;
  bound: "O" | "I";
  eta: string | null; // e.g. "3分鐘"
  etaTime: string | null; // e.g. "14:32"
  dirEn: string;
  error?: string;
}

function formatEta(etaStr: string | null): { eta: string; etaTime: string | null } {
  if (!etaStr) return { eta: "無班", etaTime: null };
  try {
    const etaDate = new Date(etaStr);
    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin <= 0) return { eta: "即將到站", etaTime: etaDate.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }) };
    if (diffMin < 60) return { eta: `${diffMin}分鐘`, etaTime: etaDate.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }) };
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return { eta: `${hours}小時${mins}分`, etaTime: etaDate.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }) };
  } catch {
    return { eta: "Error", etaTime: null };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const favoritesParam = searchParams.get("favorites");

  if (!favoritesParam) {
    return NextResponse.json({ error: "Missing favorites" }, { status: 400 });
  }

  let favorites: FavoriteItem[];
  try {
    favorites = JSON.parse(favoritesParam);
  } catch {
    return NextResponse.json({ error: "Invalid favorites format" }, { status: 400 });
  }

  const results: DashboardItem[] = await Promise.all(
    favorites.map(async (fav): Promise<DashboardItem> => {
      try {
        const direction: Direction = "outbound";

        // Fetch route info + first stop
        let orig_tc = "";
        let dest_tc = "";
        let firstStopId = "";
        let firstStopName = "";
        let bound: "O" | "I" = "O";
        let dirEn = "Outbound";

        if (fav.company === "KMB") {
          const info = await fetchKmbInfo(fav.route, direction);
          if (info) {
            orig_tc = info.orig_tc;
            dest_tc = info.dest_tc;
          }
          const stops = await fetchKmbStops(fav.route, direction);
          if (stops && stops.length > 0) {
            firstStopId = stops[0].stop;
            const stopInfo = await fetchKmbStopInfo(firstStopId);
            firstStopName = stopInfo?.name_tc || "";
            bound = stops[0].bound;
          }
        } else {
          const info = await fetchCtbRouteInfo(fav.route);
          if (info) {
            orig_tc = info.orig_tc;
            dest_tc = info.dest_tc;
          }
          const stops = await fetchCtbRouteStops(fav.route, direction);
          if (stops && stops.length > 0) {
            firstStopId = stops[0].stop;
            const stopInfo = await fetchCtbStopInfo(firstStopId);
            firstStopName = stopInfo?.name_tc || "";
            bound = stops[0].dir === "O" ? "O" : "I";
            dirEn = stops[0].dir === "O" ? "Outbound" : "Inbound";
          }
        }

        // Fetch ETA for first stop
        let eta: string | null = null;
        let etaTime: string | null = null;

        if (firstStopId) {
          try {
            let etaData;
            if (fav.company === "CTB") {
              etaData = await fetchCtbEta(firstStopId, fav.route);
            } else {
              etaData = await fetchKmbEta(firstStopId, fav.route, 1);
            }

            if (etaData && etaData.length > 0) {
              const first = etaData[0];
              const formatted = formatEta(first.eta);
              eta = formatted.eta;
              etaTime = formatted.etaTime;
            } else {
              eta = "無班";
            }
          } catch {
            eta = "Error";
          }
        } else {
          eta = "N/A";
        }

        return {
          company: fav.company,
          route: fav.route,
          orig_tc,
          dest_tc,
          firstStopId,
          firstStopName,
          bound,
          eta,
          etaTime,
          dirEn,
        };
      } catch (e) {
        return {
          company: fav.company,
          route: fav.route,
          orig_tc: "",
          dest_tc: "",
          firstStopId: "",
          firstStopName: "",
          bound: "O" as const,
          eta: null,
          etaTime: null,
          dirEn: "Outbound",
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    })
  );

  return NextResponse.json({ results });
}
