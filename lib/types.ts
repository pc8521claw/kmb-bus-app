// KMB API Response Types
// Documentation: https://data.etabus.gov.hk/v1/transport/kmb
//
// ⚠️ 注意：KMB API 各 endpoint 嘅 `data` 形狀唔一致：
//   /route/         → object (單一路線)
//   /route-stop/    → array  (多個站點)
//   /stop/          → object (單一站點)
//   /eta/           → array  (多個班次)

export type Direction = "inbound" | "outbound";
export type ServiceType = 1 | 2; // 1=regular, 2=special (for /eta/ endpoint)
export type Bound = "O" | "I"; // O=Outbound, I=Inbound

// /route/{route}/{direction}/{variant} → data is OBJECT
export interface RouteInfo {
  route: string;
  bound: Bound;
  service_type: string; // KMB API returns as string "1" | "2"
  orig_tc: string;
  orig_en: string;
  dest_tc: string;
  dest_en: string;
  orig_sc: string;
  dest_sc: string;
}

// /route-stop/{route}/{direction}/{variant} → data is ARRAY
export interface RouteStop {
  route: string;
  bound: Bound;
  service_type: string;
  seq: string; // sequence number (as string in API)
  stop: string; // stop ID
}

// /stop/{stopId} → data is OBJECT
export interface StopInfo {
  stop: string;
  name_tc: string;
  name_en: string;
  name_sc: string;
  lat: string; // KMB API returns as string
  long: string;
}

// /eta/{stopId}/{route}/{serviceType} → data is ARRAY
export interface EtaInfo {
  route: string;
  bound: Bound;
  service_type: ServiceType; // /eta/ returns number
  seq: string;
  stop: string;
  eta: string | null; // ISO datetime string, or null if no ETA
  rmk_tc: string;
  rmk_en: string;
  rmk_sc: string;
  data_timestamp: string;
}

// Combined type for stop list display
export interface StopWithName extends RouteStop {
  name_tc: string;
  name_en: string;
}

// Direction text helper (API 用 `bound` 唔用 `direction`)
export const directionText = (bound: Bound) => {
  if (bound === "I") return { tc: "返程", en: "Inbound" };
  return { tc: "去程", en: "Outbound" };
};
