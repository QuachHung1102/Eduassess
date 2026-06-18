import { requirePageZone } from "@/lib/auth/page-guard";

// Route role-gate khu /student (theo ROUTE_ROLES). Pass-through: chỉ guard, không đổi UI.
export default async function StudentZoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageZone("/student");
  return children;
}
