// 監察清單（Watch List）管理 - localStorage
// 格式: { "KMB-58M-001A0F2C03": { stopId: "001A0F2C03", stopName: "屯門站", route: "58M", company: "KMB", direction: "outbound" }, ... }
// Key 包含 company + route + stopId，可同一路線監察多個站點

const STORAGE_KEY = "***";

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

export function getWatchList(): Record<string, WatchItem> {
  if (typeof window === "undefined") return {};
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
