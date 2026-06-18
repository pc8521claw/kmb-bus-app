import { NextRequest, NextResponse } from "next/server";
import { fetchEta } from "@/lib/kmb-api";
import type { ServiceType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get("stopId");
  const route = searchParams.get("route");
  const serviceTypeParam = searchParams.get("serviceType");

  if (!stopId || !route) {
    return NextResponse.json(
      { error: "缺少 stopId 或 route 參數" },
      { status: 400 }
    );
  }

  const serviceType: ServiceType =
    serviceTypeParam === "2" ? 2 : 1;

  try {
    const data = await fetchEta(stopId, route, serviceType);
    return NextResponse.json({ data, stopId, route, serviceType });
  } catch (e) {
    console.error("ETA API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ETA 查詢失敗" },
      { status: 500 }
    );
  }
}
