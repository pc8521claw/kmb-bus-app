import { NextRequest, NextResponse } from "next/server";
import { fetchEta as fetchKmbEta } from "@/lib/kmb-api";
import { fetchCtbEta } from "@/lib/ctb-api";
import type { ServiceType } from "@/lib/types";

// 統一 ETA API - 支援 KMB + Citybus
// ?stopId=X&route=Y&company=KMB|CTB&serviceType=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get("stopId");
  const route = searchParams.get("route");
  const company = (searchParams.get("company") as "KMB" | "CTB") || "KMB";
  const serviceTypeParam = searchParams.get("serviceType");

  if (!stopId || !route) {
    return NextResponse.json(
      { error: "缺少 stopId 或 route 參數" },
      { status: 400 }
    );
  }

  const serviceType: ServiceType = serviceTypeParam === "2" ? 2 : 1;

  try {
    let data;
    if (company === "CTB") {
      // Citybus ETA response shape 同 KMB 唔同，要 normalize
      const ctbData = await fetchCtbEta(stopId, route);
      data = ctbData.map((e) => ({
        co: e.co,
        route: e.route,
        dir: e.dir,
        seq: String(e.seq),
        stop: e.stop,
        eta: e.eta,
        dest_tc: e.dest_tc,
        dest_en: e.dest_en,
        dest_sc: e.dest_sc,
        rmk_tc: e.rmk_tc,
        rmk_en: e.rmk_en,
        rmk_sc: e.rmk_sc,
        eta_seq: e.eta_seq,
        data_timestamp: e.data_timestamp,
      }));
    } else {
      data = await fetchKmbEta(stopId, route, serviceType);
    }
    return NextResponse.json({ data, stopId, route, company, serviceType });
  } catch (e) {
    console.error("ETA API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ETA 查詢失敗" },
      { status: 500 }
    );
  }
}