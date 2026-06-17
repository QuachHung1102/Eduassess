import { prisma } from "@/lib/db/prisma";
import { CategoryManager } from "./CategoryManager";

export default async function UserCategoriesPage() {
  const categories = await prisma.userCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Loại tài khoản &amp; mã</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cấu hình prefix và định dạng mã cho từng loại người dùng. Loại hệ thống không xoá được.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
