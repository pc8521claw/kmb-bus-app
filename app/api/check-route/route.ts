import { NextRequest, NextResponse } from "next/server";
import { fetchRouteInfo } from "@/lib/kmb-api";
import { fetchCtbRouteInfo } from "@/lib/ctb-api";
import type { Direction } from "@/lib/types";

// 檢查路線是否存在（KMB + Citybus 並行查詢）
// 返 array of results: [{ company: "KMB" | "CTB", routeInfo: {...} }, ...]
//
// 用例: 重疊路線 (e.g., "720") 兩個公司可能都有
// Raymond 要求: 並行查詢，無結果唔顯示出嚟
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get("route");
  const direction = searchParams.get("direction");

  if (!route || !direction) {
    return NextResponse.json(
      { error: "缺少 route 或 direction 參數" },
      { status: 400 }
    );
  }

  if (direction !== "outbound" && direction !== "inbound") {
    return NextResponse.json(
      { error: "direction 必須係 outbound 或 inbound" },
      { status: 400 }
    );
  }

  try {
    // 並行查詢 KMB + Citybus
    const [kmbResult, ctbResult] = await Promise.allSettled([
      fetchRouteInfo(route, direction as Direction),
      fetchCtbRouteInfo(route),
    ]);

    const results: Array<{
      company: "KMB" | "CTB";
      route: string;
      bound?: "O" | "I";
      orig_tc: string;
      orig_en: string;
      dest_tc: string;
      dest_en: string;
    }> = [];

    if (kmbResult.status === "fulfilled" && kmbResult.value) {
      const info = kmbResult.value;
      results.push({
        company: "KMB",
        route: info.route,
        bound: info.bound,
        orig_tc: info.orig_tc,
        orig_en: info.orig_en,
        dest_tc: info.dest_tc,
        dest_en: info.dest_en,
      });
    }

    if (ctbResult.status === "fulfilled" && ctbResult.value) {
      const info = ctbResult.value;
      results.push({
        company: "CTB",
        route: info.route,
        // Citybus route info 冇 bound，要靠 route-stop 查
        orig_tc: info.orig_tc,
        orig_en: info.orig_en,
        dest_tc: info.dest_tc,
        dest_en: info.dest_en,
      });
    }

    if (results.length === 0) {
      return NextResponse.json(
        { exists: false, results: [], error: "搵唔到呢條路線（KMB / Citybus 都冇）" },
        { status: 404 }
      );
    }

    return NextResponse.json({ exists: true, results });
  } catch (e) {
    console.error("Check route error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "未知錯誤" },
      { status: 500 }
    );
  }
}