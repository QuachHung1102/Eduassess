import { requirePageRole } from "@/lib/auth/page-guard";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { SystemNotificationForm } from "./SystemNotificationForm";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requirePageRole("ADMIN", "OWNER");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl text-blue-600">
            <FaIcon icon={faBell} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Gửi thông báo hệ thống</h1>
        </div>
        <p className="text-sm text-gray-500">
          Soạn thông báo thủ công gửi tới các nhóm người dùng. Thông báo hiện ở chuông &amp; trang /notifications của họ.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SystemNotificationForm />
      </div>
    </div>
  );
}
