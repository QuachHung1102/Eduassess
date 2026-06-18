import { redirect } from "next/navigation";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { requirePageSession } from "@/lib/auth/page-guard";
import { can } from "@/lib/auth/permissions";
import { NotificationComposer } from "@/components/notifications/NotificationComposer";

export const dynamic = "force-dynamic";

export default async function StaffNotificationsPage() {
  const me = await requirePageSession();
  if (!(await can(me, "notification.send"))) redirect("/staff");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl text-blue-600">
            <FaIcon icon={faBell} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Gửi thông báo</h1>
        </div>
        <p className="text-sm text-gray-500">
          Soạn thông báo gửi tới nhóm, học sinh phụ trách, hoặc một người cụ thể.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <NotificationComposer />
      </div>
    </div>
  );
}
