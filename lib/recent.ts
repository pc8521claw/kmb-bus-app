// 最近搜尋路線 (Recent Searches) 管理 - localStorage
//
// 規則:
// - 最多保留 10 條
// - 去重：相同 route + direction 只保留最新一條 (timestamp 更新)
// - 順序：最近撳嘅排最前 (timestamp desc)
// - 每次訪問 `/route/{route}/{direction}` page 時自動記錄

const STORAGE_KEY = "kmb-recent-searches";
const MAX_ENTRIES = 10;

export interface RecentSearch {
  route: string;
  direction: "inbound" | "outbound";
  timestamp: number;
}

export function getRecent(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return entries.sort(
      (a: RecentSearch, b: RecentSearch) => b.timestamp - a.timestamp
    );
  } catch {
    return [];
  }
}

/**
 * 加入或更新一條 recent search
 * - 相同 route+direction 會搬去最前 + 更新 timestamp
 * - 超過 MAX_ENTRIES 會自動刪除最舊
 */
export function addRecent(
  route: string,
  direction: "inbound" | "outbound"
): RecentSearch[] {
  const current = getRecent();
  // 去重：filter 走相同 route+direction 嘅舊 entry
  const filtered = current.filter(
    (e) => !(e.route === route && e.direction === direction)
  );
  const newEntry: RecentSearch = {
    route,
    direction,
    timestamp: Date.now(),
  };
  const updated = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeRecent(
  route: string,
  direction: "inbound" | "outbound"
): RecentSearch[] {
  const current = getRecent();
  const updated = current.filter(
    (e) => !(e.route === route && e.direction === direction)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecent(): void {
  localStorage.removeItem(STORAGE_KEY);
}