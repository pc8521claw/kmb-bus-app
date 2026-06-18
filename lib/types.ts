// KMB API Response Types
// Documentation: https://data.etabus.gov.hk/v1/transport/kmb

export type Direction = "inbound" | "outbound";
export type ServiceType = 1 | 2; // 1=regular, 2=special

export interface RouteInfo {
  route: string;
  bound: "O" | "I"; // O=Outbound, I=Inbound
  service_type: ServiceType;
  orig_tc: string;
  orig_en: string;
  dest_tc: string;
  dest_en: string;
  orig_sc: string;
  dest_sc: string;
  direction: "O" | "I";
}

export interface RouteStop {
  route: string;
  bound: "O" | "I";
  service_type: ServiceType;
  seq: string; // sequence number (as string in API)
  stop: string; // stop ID
}

export interface StopInfo {
  stop: string;
  name_tc: string;
  name_en: string;
  name_sc: string;
  lat: number;
  long: number;
}

export interface EtaInfo {
  route: string;
  bound: "O" | "I";
  service_type: ServiceType;
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

// Direction text helper
export const directionText = (dir: "O" | "I") => {
  if (dir === "I") return { tc: "入境", en: "Inbound" };
  return { tc: "出境", en: "Outbound" };
};
