// 監察清單（Watch List）管理 - localStorage
// 格式: { "KMB-58M-001A0F2C03": { stopId: "001A0F2C03", stopName: "屯門站", route: "58M", company: "KMB", direction: "outbound" }, ... }
// Key 包含 company + route + stopId，可同一路線監察多個站點

const STORAGE_KEY = "kmb-watch";
const OLD_STORAGE_KEY = "kmb-favorites"; // 舊 key（已廢棄，曾與 favorites 混用）

export type Company = "KMB" | "CTB";
export type Direction = "inbound" | "outbound";

export interface WatchItem {
  stopId: string;
  stopName: string;
  route: string;
  company: Company;
  direction: Direction;
}

function makeKey(company: Company, route: string, stopId: string): string {
  return `${company}-${route}-${stopId}`;
}

// Migration: 將舊 key 的 watch 數據遷移到新 key
function migrate(): void {
  const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
  if (!oldRaw) return;

  try {
    const oldData = JSON.parse(oldRaw);
    // 檢查是否 watch 格式（帶 stopId, stopName 等欄位）
    const values = Object.values(oldData);
    if (values.length === 0) return;
    const first = values[0] as Record<string, unknown>;
    if (!first || typeof first !== "object") return;
    if (!("stopId" in first) || !("route" in first)) return;

    // 是 watch 數據，遷移到新 key
    const current = getWatchList();
    let migrated = 0;
    for (const [k, v] of Object.entries(oldData)) {
      if (!(k in current)) {
        current[k] = v as WatchItem;
        migrated++;
      }
    }
    if (migrated > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      localStorage.removeItem(OLD_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getWatchList(): Record<string, WatchItem> {
  if (typeof window === "undefined") return {};
  migrate(); // 自動遷移舊數據
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function addWatch(item: WatchItem): void {
  const key = makeKey(item.company, item.route, item.stopId);
  const current = getWatchList();
  current[key] = item;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function removeWatch(company: Company, route: string, stopId: string): void {
  const key = makeKey(company, route, stopId);
  const current = getWatchList();
  delete current[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function isWatched(company: Company, route: string, stopId: string): boolean {
  const current = getWatchList();
  return Boolean(current[makeKey(company, route, stopId)]);
}

export function getWatch(company: Company, route: string, stopId: string): WatchItem | null {
  const current = getWatchList();
  return current[makeKey(company, route, stopId)] || null;
}
