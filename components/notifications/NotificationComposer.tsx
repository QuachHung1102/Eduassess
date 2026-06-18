import { getSenderNotificationContext } from "@/lib/notifications/queries";
import { SystemNotificationForm } from "./SystemNotificationForm";

/** Wrapper server: tính khả năng gửi của người dùng hiện tại rồi render form. */
export async function NotificationComposer() {
  const ctx = await getSenderNotificationContext();
  if (!ctx) return <p className="text-sm text-gray-500">Không tải được thông tin người gửi.</p>;
  return <SystemNotificationForm groups={ctx.groups} myStudents={ctx.myStudents} />;
}
