// 監察清單（Watch List）管理 - localStorage
// 格式: { "KMB-58M": { stopId: "4CF25CB2C36E36F0", stopName: "屯門站", route: "58M", company: "KMB", direction: "outbound" }, ... }

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
  const key = `${item.company}-${item.route}`;
  const current = getWatchList();
  current[key] = item;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function removeWatch(company: Company, route: string): void {
  const key = `${company}-${route}`;
  const current = getWatchList();
  delete current[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function isWatched(company: Company, route: string): boolean {
  const current = getWatchList();
  return Boolean(current[`${company}-${route}`]);
}

export function getWatch(company: Company, route: string): WatchItem | null {
  const current = getWatchList();
  return current[`${company}-${route}`] || null;
}
