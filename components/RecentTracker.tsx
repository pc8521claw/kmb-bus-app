"use client";

// 喺 route result page mount 時自動將呢條路線加到 recent searches
// Render null (no UI impact)

import { useEffect } from "react";
import { addRecent } from "@/lib/recent";

interface RecentTrackerProps {
  route: string;
  direction: "inbound" | "outbound";
}

export default function RecentTracker({ route, direction }: RecentTrackerProps) {
  useEffect(() => {
    addRecent(route, direction);
  }, [route, direction]);

  return null;
}