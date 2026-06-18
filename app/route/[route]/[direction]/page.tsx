import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchRouteInfo,
  fetchStopsWithNames,
} from "@/lib/kmb-api";
import { directionText } from "@/lib/types";
import StopList from "@/components/StopList";

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
          <p className="text-stone-800 mb-6">
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

  return (
    <main className="flex-1 flex flex-col px-4 py-6 sm:py-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-stone-800 hover:text-blue-600 mb-4 transition-colors"
        >
          ← 返回搜尋
        </Link>

        {/* Route Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded mb-2">
                {dir.tc} · {dir.en}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                路線 {routeInfo.route}
              </h1>
            </div>
            <div className="text-right text-sm">
              <div className="text-stone-800">服務類型</div>
              <div className="font-medium">
                {String(serviceType) === "1" ? "常規" : "特別"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-stone-800 shrink-0">起點</span>
              <div>
                <div className="font-medium">{routeInfo.orig_tc}</div>
                <div className="text-stone-800 text-xs">{routeInfo.orig_en}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-stone-800 shrink-0">終點</span>
              <div>
                <div className="font-medium">{routeInfo.dest_tc}</div>
                <div className="text-stone-800 text-xs">{routeInfo.dest_en}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stops Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <span>途經站點</span>
            <span className="text-xs text-stone-800 font-normal">
              ({stops.length} 站)
            </span>
          </h2>

          {stops.length === 0 ? (
            <p className="text-stone-800 text-sm text-center py-8">
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
        <div className="mt-8 text-center text-xs text-stone-800">
          數據來源：九巴開放數據 API
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
