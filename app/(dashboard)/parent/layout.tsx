import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /parent (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function ParentZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/parent");
  return children;
}
