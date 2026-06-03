export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-500 mb-6">Trang bạn tìm kiếm không tồn tại.</p>
        <Link
          href="/"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
