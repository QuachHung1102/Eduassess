"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faBell, faCircleCheck } from "@fortawesome/free-solid-svg-icons";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: Date | null;
  href: string | null;
  createdAt: Date;
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRead(id: string, href: string | null) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      if (href) router.push(href);
    });
  }

  function handleReadAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleReadAll}
            disabled={isPending}
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline disabled:opacity-60"
          >
            <FaIcon icon={faCircleCheck} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-3"><FaIcon icon={faBell} /></div>
          <p>Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleRead(n.id, n.href)}
              disabled={isPending}
              className={`w-full text-left rounded-xl border p-4 transition-colors hover:bg-gray-50 disabled:opacity-60 ${
                n.readAt ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-blue-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.readAt ? "text-gray-700" : "text-gray-900"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
