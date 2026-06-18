import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /teacher (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function TeacherZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/teacher");
  return children;
}
