import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /owner (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function OwnerZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/owner");
  return children;
}
