import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /staff (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function StaffZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/staff");
  return children;
}
