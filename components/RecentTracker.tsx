"use client";

// 喺 route result page mount 時自動將呢條路線加到 recent searches
// Render null (no UI impact)

import { useEffect } from "react";
import { addRecent, type Company } from "@/lib/recent";

interface RecentTrackerProps {
  route: string;
  direction: "inbound" | "outbound";
  company: Company;
}

export default function RecentTracker({ route, direction, company }: RecentTrackerProps) {
  useEffect(() => {
    addRecent(company, route, direction);
  }, [company, route, direction]);

  return null;
}