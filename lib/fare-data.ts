// hk-bus-crawling Route Fare Data Client
// 數據源: https://hkbus.github.io/hk-bus-crawling/routeFareList.min.json
// 涵蓋 KMB/CTB/NLB/MTR/小巴 嘅 route/fare/schedule/stop 數據
//
// ⚠️ 預設唔自動更新。要更新請跑 `bash scripts/update-fare-data.sh`

import type { Bound, Direction } from "./types";
import fareDataRaw from "@/data/routeFareList.min.json";

// ===== Types =====

export interface FareData {
  holidays: string[];
  routeList: Record<string, RouteFareEntry>;
  serviceDayMap: Record<string, string[]>;
  stopList: Record<string, StopInfo>;
  stopMap: Record<string, [string, string][]>;
}

export interface RouteFareEntry {
  bound: { kmb?: Bound; gmb?: Bound; ctb?: Bound; nlb?: Bound };
  co: string[]; // company: ["kmb"], ["ctb"], ["gmb"], etc.
  dest: { en: string; zh: string };
  fares: string[] | null; // 分段車費 (按段收費)
  faresHoliday: string[] | null; // 假期車費
  // freq: { serviceDayId: { startTime: [endTime, frequencySec] } }
  freq: Record<string, Record<string, [string, number]>>;
  gtfsId: string | null;
  jt: string | null; // journey time (分鐘)
  nlbId: string | null;
  orig: { en: string; zh: string };
  route: string;
  seq: number;
  serviceType: string; // "1" = regular, "2" = special, "3" = other
  stops: { kmb?: string[]; gmb?: string[]; ctb?: string[] };
}

export interface StopInfo {
  location: { lat: number; lng: number };
  name: { en: string; zh: string };
}

export interface ScheduleSlot {
  startTime: string; // "06:05"
  endTime: string; // "06:53"
  frequencyMin: number; // 班次頻率（分鐘）
}

// ===== Data Loading =====

// JSON 嘅 freq value 係 [endTime, frequencySec] tuple，
// 但 resolveJsonModule 會推斷為 string[]，所以用 unknown cast
const FARE_DATA = fareDataRaw as unknown as FareData;

// ===== Internal Helpers =====

const directionToBound = (direction: Direction): Bound =>
  direction === "inbound" ? "I" : "O";

/**
 * 根據 route + direction + serviceType 揾到對應嘅 KMB fare entry
 * 用 (route, bound.kmb, serviceType) 三個 key 嚟 match
 */
function findKmbEntry(
  route: string,
  direction: Direction,
  serviceType: string
): RouteFareEntry | null {
  const targetBound = directionToBound(direction);
  for (const entry of Object.values(FARE_DATA.routeList)) {
    if (
      entry.route === route &&
      entry.co.includes("kmb") &&
      entry.bound.kmb === targetBound &&
      String(entry.serviceType) === String(serviceType)
    ) {
      return entry;
    }
  }
  return null;
}

/**
 * "0605" -> "06:05"
 */
function formatHHMM(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

// ===== Public API =====

/**
 * 全程車費（最貴一段嘅車費）
 * @returns HK$ value (e.g., "10.80") or null if no data
 */
export function getFullFare(
  route: string,
  direction: Direction,
  serviceType: string = "1"
): string | null {
  const entry = findKmbEntry(route, direction, serviceType);
  if (!entry || !entry.fares || entry.fares.length === 0) return null;
  const max = Math.max(...entry.fares.map(Number));
  return max.toFixed(2);
}

/**
 * 分段車費（按段收費列表）
 */
export function getSectionFares(
  route: string,
  direction: Direction,
  serviceType: string = "1"
): string[] | null {
  const entry = findKmbEntry(route, direction, serviceType);
  if (!entry || !entry.fares) return null;
  return entry.fares;
}

/**
 * 服務時間表
 * 將所有 serviceDay 版本合併去重，按 startTime 排序
 * 每個 slot: { startTime, endTime, frequencyMin }
 */
export function getSchedule(
  route: string,
  direction: Direction,
  serviceType: string = "1"
): ScheduleSlot[] | null {
  const entry = findKmbEntry(route, direction, serviceType);
  if (!entry || !entry.freq || Object.keys(entry.freq).length === 0) return null;

  // 合併所有 serviceDay 嘅時段 (用 startTime 去重)
  // ⚠️ hk-bus-crawling 數據有兩個 quirks 要 handle:
  //   1. value 可能是 null (e.g., 80X "0740": null) → filter 走
  //   2. value[1] (frequency seconds) 可能是 string ("540") 而非 number (540) → Number() 轉
  const slotMap = new Map<string, [string, number]>();
  for (const dayEntries of Object.values(entry.freq)) {
    for (const [startTime, value] of Object.entries(dayEntries)) {
      // Skip null 同無效 array values
      if (
        value &&
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "string" &&
        (typeof value[1] === "number" || typeof value[1] === "string")
      ) {
        const freqSec = Number(value[1]);
        if (!isNaN(freqSec) && !slotMap.has(startTime)) {
          slotMap.set(startTime, [value[0], freqSec]);
        }
      }
    }
  }

  const slots: ScheduleSlot[] = [];
  for (const [startTime, [endTime, freqSec]] of slotMap) {
    slots.push({
      startTime: formatHHMM(startTime),
      endTime: formatHHMM(endTime),
      frequencyMin: Math.round(freqSec / 60),
    });
  }

  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * 從 schedule 抽出首班車 + 尾班車時間
 */
export function getServiceHours(
  route: string,
  direction: Direction,
  serviceType: string = "1"
): { firstBus: string; lastBus: string } | null {
  const schedule = getSchedule(route, direction, serviceType);
  if (!schedule || schedule.length === 0) return null;
  return {
    firstBus: schedule[0].startTime,
    lastBus: schedule[schedule.length - 1].endTime,
  };
}