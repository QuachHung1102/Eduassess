import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /admin (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function AdminZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/admin");
  return children;
}
