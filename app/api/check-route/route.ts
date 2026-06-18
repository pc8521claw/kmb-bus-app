import { NextRequest, NextResponse } from "next/server";
import { fetchRouteInfo } from "@/lib/kmb-api";
import type { Direction } from "@/lib/types";

// 檢查路線是否存在（KMB API）
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
    const routeInfo = await fetchRouteInfo(route, direction as Direction);
    if (!routeInfo) {
      return NextResponse.json(
        { exists: false, error: "路線不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json({ exists: true, route: routeInfo });
  } catch (e) {
    console.error("Check route error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "未知錯誤" },
      { status: 500 }
    );
  }
}
