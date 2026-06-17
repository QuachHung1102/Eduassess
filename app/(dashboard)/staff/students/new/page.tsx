import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/auth/page-guard";
import { can } from "@/lib/auth/permissions";
import { NewStudentForm } from "./NewStudentForm";

export default async function NewStudentPage() {
  const me = await requirePageSession();
  if (!(await can(me, "student.create"))) redirect("/staff/students");

  return (
    <div className="flex flex-col h-full gap-4 max-w-2xl">
      <div className="shrink-0">
        <Link href="/staff/students" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Học sinh phụ trách
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Thêm học sinh</h1>
        <p className="text-gray-500 text-sm mt-1">Mã học sinh (HS-năm-số) sẽ được sinh tự động.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <NewStudentForm />
      </div>
    </div>
  );
}
