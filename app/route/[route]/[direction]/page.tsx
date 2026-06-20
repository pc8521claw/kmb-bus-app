import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchRouteInfo,
  fetchStopsWithNames,
} from "@/lib/kmb-api";
import {
  getFullFare,
  getSchedule,
  getServiceHours,
} from "@/lib/fare-data";
import { directionText } from "@/lib/types";
import StopList from "@/components/StopList";
import FavoriteButton from "@/components/FavoriteButton";
import RecentTracker from "@/components/RecentTracker";

interface PageProps {
  params: Promise<{
    route: string;
    direction: string;
  }>;
}

export default async function RoutePage({ params }: PageProps) {
  const { route, direction } = await params;

  // 驗證 direction
  if (direction !== "inbound" && direction !== "outbound") {
    notFound();
  }

  // 並行 fetch：路線 + 所有站點
  const [routeInfo, stops] = await Promise.all([
    fetchRouteInfo(route, direction),
    fetchStopsWithNames(route, direction),
  ]);

  // 路線唔存在
  if (!routeInfo) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">搵唔到路線 {route}</h1>
          <p className="text-stone-900 mb-6">
            請檢查路線號碼，或者試下其他方向。
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回搜尋
          </Link>
        </div>
      </main>
    );
  }

  const dir = directionText(routeInfo.bound);
  const serviceType = routeInfo.service_type;

  // 取得車費 + 服務時間數據 (從本地 hk-bus-crawling data)
  const fullFare = getFullFare(route, direction, serviceType);
  const schedule = getSchedule(route, direction, serviceType);
  const serviceHours = getServiceHours(route, direction, serviceType);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 sm:py-8">
      {/* 自動記錄到 recent searches */}
      <RecentTracker route={route} direction={direction} />
      <div className="w-full max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg shadow-sm hover:border-blue-400 hover:text-blue-600 hover:shadow transition-all"
        >
          <span>←</span>
          <span>返回搜尋</span>
        </Link>

        {/* Route Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                  {dir.tc} · {dir.en}
                </span>
                <Link
                  href={`/route/${routeInfo.route}/${routeInfo.bound === "O" ? "inbound" : "outbound"}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors"
                >
                  <span>↔</span>
                  <span>改變方向</span>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  路線 {routeInfo.route}
                </h1>
                <FavoriteButton route={routeInfo.route} />
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-stone-900">服務類型</div>
              <div className="font-medium">
                {String(serviceType) === "1" ? "常規" : "特別"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-stone-900 shrink-0">起點</span>
              <div>
                <div className="font-medium">{routeInfo.orig_tc}</div>
                <div className="text-stone-900 text-xs">{routeInfo.orig_en}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-stone-900 shrink-0">終點</span>
              <div>
                <div className="font-medium">{routeInfo.dest_tc}</div>
                <div className="text-stone-900 text-xs">{routeInfo.dest_en}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fare & Schedule Section */}
        {(fullFare || schedule) && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6 mb-4">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <span>💰</span>
              <span>車費及服務時間</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Full Fare */}
              <div className="bg-stone-50 rounded-lg p-4">
                <div className="text-stone-900 text-xs mb-1">全程車費</div>
                {fullFare ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-stone-900">HK$</span>
                    <span className="text-2xl font-bold">{fullFare}</span>
                  </div>
                ) : (
                  <div className="text-stone-900 text-sm">暫無車費資料</div>
                )}
                <div className="text-xs text-stone-900 mt-1">
                  八達通 / 現金 · 不設找續
                </div>
              </div>

              {/* Service Hours */}
              <div className="bg-stone-50 rounded-lg p-4">
                <div className="text-stone-900 text-xs mb-1">服務時間</div>
                {serviceHours ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-medium">
                      {serviceHours.firstBus}
                    </span>
                    <span className="text-stone-900 text-xs">至</span>
                    <span className="text-base font-medium">
                      {serviceHours.lastBus}
                    </span>
                  </div>
                ) : (
                  <div className="text-stone-900 text-sm">暫無資料</div>
                )}
                <div className="text-xs text-stone-900 mt-1">
                  首班車 → 尾班車
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            {schedule && schedule.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer text-stone-700 hover:text-blue-600 select-none">
                  📅 詳細班次表 ({schedule.length} 個時段)
                </summary>
                <div className="mt-3 max-h-64 overflow-y-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-100 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-stone-700">
                          由
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-stone-700">
                          至
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-stone-700">
                          班次
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((slot, idx) => (
                        <tr
                          key={`${slot.startTime}-${idx}`}
                          className="border-t border-stone-100"
                        >
                          <td className="px-3 py-2 font-mono">
                            {slot.startTime}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {slot.endTime}
                          </td>
                          <td className="px-3 py-2 text-right">
                            每 {slot.frequencyMin} 分鐘
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Stops Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <span>途經站點</span>
            <span className="text-xs text-stone-900 font-normal">
              ({stops.length} 站)
            </span>
          </h2>

          {stops.length === 0 ? (
            <p className="text-stone-900 text-sm text-center py-8">
              此路線暫無站點資料
            </p>
          ) : (
            <StopList
              stops={stops}
              route={routeInfo.route}
              serviceType={String(serviceType) === "2" ? 2 : 1}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-stone-900 opacity-50">
          數據來源：九巴開放數據 API + hk-bus-crawling
        </div>
      </div>
    </main>
  );
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  const { route, direction } = await params;
  const dir = direction === "inbound" ? "入境" : "出境";
  return {
    title: `路線 ${route} (${dir}) | KMB 巴士路線查詢`,
    description: `KMB 路線 ${route} ${dir} 站點同預計到站時間`,
  };
}
