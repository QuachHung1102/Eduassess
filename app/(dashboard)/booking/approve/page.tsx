/**
 * /booking/approve — Hàng chờ duyệt lịch đặt phòng
 * Quyền: BOOKING_APPROVE
 */

import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { requirePageSession } from "@/lib/auth/page-guard";
import { getAllBookings } from "@/lib/booking/queries";
import { ApproveQueue } from "./ApproveQueue";

export default async function BookingApprovePage() {
  const user = await requirePageSession();

  const allowed = await can(user, PERMISSIONS.BOOKING_APPROVE.key);
  if (!allowed) redirect("/booking");

  const pending = await getAllBookings({ status: "PENDING" });

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Duyệt đặt phòng</h1>
          <p className="text-sm text-foreground/60 mt-1">
            {pending.length > 0
              ? `${pending.length} yêu cầu đang chờ duyệt`
              : "Không có yêu cầu nào đang chờ"}
          </p>
        </div>
        <a
          href="/booking"
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          ← Quay lại
        </a>
      </div>

      <ApproveQueue bookings={pending} reviewerId={user.id} />
    </div>
  );
}
