import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">搵唔到頁面</h1>
        <p className="text-stone-700 mb-6">
          你搵嘅頁面唔存在，或者已經被移除。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          返回首頁
        </Link>
      </div>
    </main>
  );
}
