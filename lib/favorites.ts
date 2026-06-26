// 常用路線（favorites）管理 - localStorage
// 格式: { "KMB-58M": true, "CTB-720": true }
// 用 company-route 格式避免 KMB / CTB 重疊路線衝突

const STORAGE_KEY = "***";

export type Company = "KMB" | "CTB";

function makeKey(company: Company, route: string): string {
  return `${company}-${route}`;
}

export function getFavorites(): Array<{ company: Company; route: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw);
    // 兼容舊格式 (array of route strings) — 默認 KMB
    // 順便 migrate 落新 object format 寫返
    if (Array.isArray(stored)) {
      const migrated: Record<string, boolean> = {};
      stored.forEach((r) => {
        if (typeof r === "string") migrated[`KMB-${r}`] = true;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return stored.map((r) => ({
        company: "KMB" as Company,
        route: r,
      }));
    }
    return Object.keys(stored)
      .filter((k) => stored[k])
      .map((k) => {
        const [company, ...routeParts] = k.split("-");
        return {
          company: (company as Company) || "KMB",
          route: routeParts.join("-"), // 處理 route 入面有 '-' 嘅情況
        };
      });
  } catch {
    return [];
  }
}

export function addFavorite(company: Company, route: string): void {
  const current = getFavorites();
  if (current.some((f) => f.company === company && f.route === route)) return;
  const stored = readStorage();
  stored[makeKey(company, route)] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function removeFavorite(company: Company, route: string): void {
  const stored = readStorage();
  delete stored[makeKey(company, route)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function isFavorite(company: Company, route: string): boolean {
  const stored = readStorage();
  return Boolean(stored[makeKey(company, route)]);
}

function readStorage(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // 兼容舊格式 (array)
    if (Array.isArray(parsed)) {
      const result: Record<string, boolean> = {};
      parsed.forEach((r) => {
        if (typeof r === "string") {
          result[`KMB-${r}`] = true;
        }
      });
      return result;
    }
    return parsed;
  } catch {
    return {};
  }
}