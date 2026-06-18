// 常用路線（favorites）管理 - localStorage

const STORAGE_KEY = "kmb-favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addFavorite(route: string): string[] {
  const current = getFavorites();
  if (current.includes(route)) return current;
  const updated = [...current, route];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFavorite(route: string): string[] {
  const current = getFavorites();
  const updated = current.filter((r) => r !== route);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function isFavorite(route: string): boolean {
  return getFavorites().includes(route);
}
