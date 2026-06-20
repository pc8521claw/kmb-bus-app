// KMB API Client
// Base URL: https://data.etabus.gov.hk/v1/transport/kmb
// 公共 API，唔需要認證

import type {
  RouteInfo,
  RouteStop,
  StopInfo,
  EtaInfo,
  StopWithName,
  Direction,
  ServiceType,
} from "./types";

const BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";
const DEFAULT_VARIANT = 1;

/**
 * 取得路線資料
 * GET /route/{route}/{direction}/{variant}
 */
export async function fetchRouteInfo(
  route: string,
  direction: Direction,
  variant: number = DEFAULT_VARIANT
): Promise<RouteInfo | null> {
  const url = `${BASE_URL}/route/${encodeURIComponent(route)}/${direction}/${variant}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`KMB API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  // KMB API 對錯嘅 route 返 data: {} (空 object)
  // 要 check 埋 data 裡面有冇實際內容
  if (!json.data || typeof json.data !== "object" || !("route" in json.data) || Object.keys(json.data).length === 0) return null;
  return json.data as RouteInfo;
}

/**
 * 取得路線所有站點
 * GET /route-stop/{route}/{direction}/{variant}
 */
export async function fetchRouteStops(
  route: string,
  direction: Direction,
  variant: number = DEFAULT_VARIANT
): Promise<RouteStop[]> {
  const url = `${BASE_URL}/route-stop/${encodeURIComponent(route)}/${direction}/${variant}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`KMB API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  return (json.data || []).sort(
    (a: RouteStop, b: RouteStop) => parseInt(a.seq) - parseInt(b.seq)
  );
}

/**
 * 取得單一站點資料
 * GET /stop/{stopId}
 */
export async function fetchStopInfo(stopId: string): Promise<StopInfo | null> {
  const url = `${BASE_URL}/stop/${encodeURIComponent(stopId)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`KMB API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  if (!json.data || typeof json.data !== "object") return null;
  return json.data as StopInfo;
}

/**
 * 取得站點 ETA
 * GET /eta/{stopId}/{route}/{serviceType}
 */
export async function fetchEta(
  stopId: string,
  route: string,
  serviceType: ServiceType = 1
): Promise<EtaInfo[]> {
  const url = `${BASE_URL}/eta/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}/${serviceType}`;
  const res = await fetch(url, { next: { revalidate: 30 } });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`KMB API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  return json.data || [];
}

/**
 * 並行取得所有站點資料（解決 N+1 query）
 * 原本 HTML 會每個站點獨立 fetch，呢度一次過 batch
 */
export async function fetchStopsWithNames(
  route: string,
  direction: Direction
): Promise<StopWithName[]> {
  const stops = await fetchRouteStops(route, direction);
  if (stops.length === 0) return [];

  const withNames = await Promise.all(
    stops.map(async (stop) => {
      const info = await fetchStopInfo(stop.stop);
      return {
        ...stop,
        name_tc: info?.name_tc || stop.stop,
        name_en: info?.name_en || "",
        lat: info?.lat || "",
        long: info?.long || "",
      };
    })
  );
  return withNames;
}
