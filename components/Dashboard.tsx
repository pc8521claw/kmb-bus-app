"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getWatchList, type Company } from "@/lib/watch";

interface EtaEntry {
  eta: string | null;
  etaTime: string | null;
}

interface DashboardItem {
  company: Company;
  route: string;
  direction: "inbound" | "outbound";
  stopId: string;
  dest_tc: string;
  stopName: string;
  etaList: EtaEntry[];
  error?: string;
}

const STORAGE_KEY = "kmb-watch-order";

export default function Dashboard() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [editMode, setEditMode] = useState(false); // drag lock toggle

  // Format ETA like StopList: "X分鐘" + "(下午HH:MM)"
  const formatEta = (etaStr: string | null) => {
    if (!etaStr) return null;
    const d = new Date(etaStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return { eta: "即將到站", time: d.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }) };
    return { eta: `${diffMin}分鐘`, time: d.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }) };
  };

  // Render ETA list - up to 2 entries stacked vertically
  const renderEtaList = (etaList: EtaEntry[]) => {
    if (!etaList || etaList.length === 0) {
      return <span className="text-stone-900">—</span>;
    }
    return (
      <div className="text-right">
        {etaList.map((entry, i) => {
          const f = formatEta(entry.etaTime);
          return (
            <div key={i} className={i > 0 ? "mt-0.5" : ""}>
              <span className="text-green-600 font-medium">{entry.eta || "—"}</span>
              {f && <span className="text-xs text-stone-900"> ({f.time})</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const fetchDashboard = useCallback(async () => {
    const watches = getWatchList();
    const watchArray = Object.values(watches);
    if (watchArray.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Restore saved order or use default order
    const savedOrder = localStorage.getItem(STORAGE_KEY);
    let orderedWatches = watchArray;
    if (savedOrder) {
      try {
        const orderMap: Record<string, number> = JSON.parse(savedOrder);
        orderedWatches = watchArray.sort((a, b) => {
          const keyA = `${a.company}-${a.route}-${a.stopId}`;
          const keyB = `${b.company}-${b.route}-${b.stopId}`;
          return (orderMap[keyA] ?? 999) - (orderMap[keyB] ?? 999);
        });
      } catch {
        // ignore parse errors
      }
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard?watches=${encodeURIComponent(JSON.stringify(orderedWatches))}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.results || []);
      } else {
        console.error("Dashboard API error:", res.status);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Mouse drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setItems(newItems);

    // Persist new order to localStorage
    const orderMap: Record<string, number> = {};
    newItems.forEach((item, i) => {
      const key = `${item.company}-${item.route}-${item.stopId}`;
      orderMap[key] = i;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setTouchDragIndex(index);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragIndex === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const dropTarget = elements.find(el => el.hasAttribute('data-drag-index'));

    if (dropTarget) {
      const dropIndex = parseInt(dropTarget.getAttribute('data-drag-index') || '0', 10);
      if (dropIndex !== dragOverIndex && dropIndex !== touchDragIndex) {
        setDragOverIndex(dropIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchDragIndex === null || dragOverIndex === null || touchDragIndex === dragOverIndex) {
      setTouchDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(touchDragIndex, 1);
    newItems.splice(dragOverIndex, 0, draggedItem);
    setItems(newItems);

    // Persist new order to localStorage
    const orderMap: Record<string, number> = {};
    newItems.forEach((item, i) => {
      const key = `${item.company}-${item.route}-${item.stopId}`;
      orderMap[key] = i;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));

    setTouchDragIndex(null);
    setDragOverIndex(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-stone-900 mb-4">載入中...</div>
        <div className="text-xs text-stone-900 opacity-60">自動每30秒刷新</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-stone-900 text-lg mb-2">暫無監察站點</div>
        <div className="text-stone-900 text-sm opacity-60 mb-6 text-center">
          搜尋路線後，撳「加入監察」<br />監察特定巴士站
        </div>
        <button
          onClick={() => window.location.href = "/"}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          去搜尋
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">監察名單</h2>
          {/* Edit mode toggle */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                editMode
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {editMode ? "✏️ 排序" : "排序"}
            </button>
            {editMode && (
              <span className="text-xs text-stone-900 opacity-60">拖動排序</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {loading ? "更新中..." : "立即更新"}
          </button>
          <span className="text-xs text-stone-900 opacity-60">每30秒自動更新</span>
        </div>
      </div>

      {/* Dashboard List */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;

          return (
            <div
              key={`${item.company}-${item.route}-${item.stopId}`}
              draggable={editMode}
              data-drag-index={index}
              onDragStart={editMode ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={editMode ? (e) => handleDragOver(e, index) : undefined}
              onDrop={editMode ? (e) => handleDrop(e, index) : undefined}
              onDragEnd={editMode ? handleDragEnd : undefined}
              onTouchStart={editMode ? (e) => handleTouchStart(e, index) : undefined}
              onTouchMove={editMode ? handleTouchMove : undefined}
              onTouchEnd={editMode ? () => handleTouchEnd() : undefined}
              className={`bg-white rounded-xl border transition-all touch-none ${
                editMode
                  ? isDragging
                    ? "border-blue-400 opacity-50 shadow-lg scale-[1.02]"
                    : isDragOver
                    ? "border-blue-300 shadow-md"
                    : "border-stone-200 hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing"
                  : "border-stone-200"
              }`}
            >
              <Link
                href={`/route/${encodeURIComponent(item.route)}/${item.direction}?company=${item.company}`}
                className="block p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Drag handle + Route Info */}
                  <div className="flex items-center gap-3">
                    {/* Company dot */}
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: item.company === "KMB" ? "#f59e0b" : "#3b82f6",
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: item.company === "KMB" ? "#fef3c7" : "#dbeafe",
                            color: item.company === "KMB" ? "#92400e" : "#1e40af",
                          }}
                        >
                          {item.company}
                        </span>
                        <span className="text-xl font-bold text-stone-900">
                          {item.route}
                        </span>
                      </div>
                      <div className="text-blue-600">
                        <span className="text-xs">往 </span>
                        <span className="text-base font-bold">{item.dest_tc}</span>
                      </div>
                      <div className="text-xs text-stone-900 opacity-60 mt-0.5">
                        📍 {item.stopName}
                      </div>
                    </div>
                  </div>

                  {/* ETA - up to 2 entries */}
                  {renderEtaList(item.etaList)}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
