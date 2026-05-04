import { getNotifications } from "@/lib/notifications/queries";
import { NotificationList } from "./NotificationList";

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return <NotificationList notifications={notifications} />;
}
