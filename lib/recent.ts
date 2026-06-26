// 最近搜尋路線 (Recent Searches) 管理 - localStorage
//
// 規則:
// - 最多保留 12 條
// - 去重：相同 (company + route + direction) 只保留最新一條
// - 順序：最近撳嘅排最前 (timestamp desc)
// - 每次訪問 `/route/{route}/{direction}?company=...` page 時自動記錄

const STORAGE_KEY = "kmb-re…ches";
const MAX_ENTRIES = 12;

export type Company = "KMB" | "CTB";

export interface RecentSearch {
  company: Company;
  route: string;
  direction: "inbound" | "outbound";
  timestamp: number;
}

export function getRecent(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw);
    // 兼容舊格式 (無 company) — 默認 KMB
    // 順便 migrate 落新格式寫返
    let needsMigrate = false;
    const normalized = entries.map((e: RecentSearch) => {
      if (!e.company) {
        needsMigrate = true;
        return { ...e, company: "KMB" };
      }
      return e;
    });
    if (needsMigrate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized.sort(
      (a: RecentSearch, b: RecentSearch) => b.timestamp - a.timestamp
    );
  } catch {
    return [];
  }
}

/**
 * 加入或更新一條 recent search
 * - 相同 (company + route + direction) 會搬去最前 + 更新 timestamp
 * - 超過 MAX_ENTRIES 會自動刪除最舊
 */
export function addRecent(
  company: Company,
  route: string,
  direction: "inbound" | "outbound"
): RecentSearch[] {
  const current = getRecent();
  // 去重
  const filtered = current.filter(
    (e) => !(e.company === company && e.route === route && e.direction === direction)
  );
  const newEntry: RecentSearch = {
    company,
    route,
    direction,
    timestamp: Date.now(),
  };
  const updated = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeRecent(
  company: Company,
  route: string,
  direction: "inbound" | "outbound"
): RecentSearch[] {
  const current = getRecent();
  const updated = current.filter(
    (e) => !(e.company === company && e.route === route && e.direction === direction)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecent(): void {
  localStorage.removeItem(STORAGE_KEY);
}