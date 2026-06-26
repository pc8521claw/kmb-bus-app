// Citybus V2 API Client (城巴新巴)
// Base URL: https://rt.data.gov.hk/v2/transport/citybus/
// 公開 API，唔需認證
//
// 注意: 新巴 (NWFB) 已於 2023-07-01 合併入城巴 (CTB)
// 所有新巴路線都用 company_id "CTB" query
//
// 規格: https://www.citybus.com.hk/datagovhk/bus_eta_api_specifications.pdf

import type { Direction } from "./types";

const BASE_URL = "https://rt.data.gov.hk/v2/transport/citybus";
const COMPANY_ID = "CTB"; // Citybus (includes New World First Bus since 2023-07-01)

/**
 * 取得路線資料
 * GET /route/{company_id}/{route}
 */
export async function fetchCtbRouteInfo(
  route: string
): Promise<CtbRouteInfo | null> {
  const url = `${BASE_URL}/route/${COMPANY_ID}/${encodeURIComponent(route)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    if (res.status === 404) return null;
    if (res.status === 422) return null; // Invalid route
    throw new Error(`Citybus API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  if (!json.data || typeof json.data !== "object" || !("route" in json.data)) return null;
  return json.data as CtbRouteInfo;
}

/**
 * 取得路線所有站點
 * GET /route-stop/{company_id}/{route}/{direction}
 */
export async function fetchCtbRouteStops(
  route: string,
  direction: Direction
): Promise<CtbRouteStop[]> {
  const url = `${BASE_URL}/route-stop/${COMPANY_ID}/${encodeURIComponent(route)}/${direction}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    if (res.status === 404) return [];
    if (res.status === 422) return [];
    throw new Error(`Citybus API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  return (json.data || []).sort(
    (a: CtbRouteStop, b: CtbRouteStop) => a.seq - b.seq
  );
}

/**
 * 取得單一站點資料
 * GET /stop/{stop_id}
 */
export async function fetchCtbStopInfo(stopId: string): Promise<CtbStopInfo | null> {
  const url = `${BASE_URL}/stop/${encodeURIComponent(stopId)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Citybus API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  if (!json.data || typeof json.data !== "object") return null;
  return json.data as CtbStopInfo;
}

/**
 * 並行取得所有站點資料（解決 N+1 query）
 */
export async function fetchCtbStopsWithNames(
  route: string,
  direction: Direction
): Promise<CtbStopWithName[]> {
  const stops = await fetchCtbRouteStops(route, direction);
  if (stops.length === 0) return [];

  const withNames = await Promise.all(
    stops.map(async (stop) => {
      const info = await fetchCtbStopInfo(stop.stop);
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

/**
 * 取得站點 ETA
 * GET /eta/{company_id}/{stop_id}/{route}
 * 最多 3 個 ETA
 */
export async function fetchCtbEta(
  stopId: string,
  route: string
): Promise<CtbEtaInfo[]> {
  const url = `${BASE_URL}/eta/${COMPANY_ID}/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}`;
  const res = await fetch(url, { next: { revalidate: 30 } });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Citybus API 錯誤 (${res.status})`);
  }

  const json = await res.json();
  return json.data || [];
}

// ===== Types =====

export interface CtbRouteInfo {
  co: "CTB";
  route: string;
  orig_tc: string;
  orig_en: string;
  dest_tc: string;
  dest_en: string;
  orig_sc: string;
  dest_sc: string;
  data_timestamp?: string;
}

export interface CtbRouteStop {
  co: "CTB";
  route: string;
  dir: "I" | "O"; // Inbound / Outbound
  seq: number;
  stop: string; // 6-digit stop ID
  data_timestamp?: string;
}

export interface CtbStopInfo {
  stop: string;
  name_tc: string;
  name_en: string;
  name_sc: string;
  lat: string;
  long: string;
  data_timestamp?: string;
}

export interface CtbEtaInfo {
  co: "CTB";
  route: string;
  dir: "I" | "O";
  seq: number;
  stop: string;
  dest_tc: string;
  dest_en: string;
  dest_sc: string;
  eta: string | null; // ISO datetime
  eta_seq: number; // 1, 2, 3
  rmk_tc: string;
  rmk_en: string;
  rmk_sc: string;
  data_timestamp: string;
}

export interface CtbStopWithName extends CtbRouteStop {
  name_tc: string;
  name_en: string;
  lat: string;
  long: string;
}