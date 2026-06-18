import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_HOME, ROUTE_ROLES, getAllowedRolesFor } from "@/lib/auth/access";

const DASHBOARD_DIR = join(process.cwd(), "app", "(dashboard)");

// Mô hình bảo vệ route trong khu đăng nhập (3 nhóm, khai báo TƯỜNG MINH):
//
// 1. ROLE-GATED — chặn theo role tại zone layout (requirePageZone). Đúng bằng
//    tập khu nhà của các role (ROLE_HOME) → nguồn sự thật, không hard-code.
const ROLE_GATED_ZONES = new Set(
  Object.values(ROLE_HOME).map((p) => p.replace(/^\//, "")),
);
// 2. SHARED — mọi role đăng nhập đều vào được; dashboard layout đã chặn auth.
const SHARED_ZONES = new Set(["notifications", "settings", "dashboard"]);
// 3. PERMISSION-GATED — gate theo permission ngay tại page (can()/requirePermission),
//    KHÔNG theo role cố định (vd /booking: quyền booking.create có thể cấp cho nhiều role).
const PERMISSION_GATED_ZONES = new Set(["booking"]);

/** Tên các thư mục zone thật trong (dashboard), bỏ route group/slot/private. */
function zoneDirs(): string[] {
  return readdirSync(DASHBOARD_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !n.startsWith("(") && !n.startsWith("_") && !n.startsWith("@"));
}

/** Mọi file page.tsx (đệ quy) dưới một zone. */
function pageFiles(zone: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.tsx") out.push(full);
    }
  };
  walk(join(DASHBOARD_DIR, zone));
  return out;
}

describe("getAllowedRolesFor — map prefix → roles", () => {
  it("khớp đúng prefix và cả route con", () => {
    expect(getAllowedRolesFor("/admin")).toEqual(ROUTE_ROLES["/admin"]);
    expect(getAllowedRolesFor("/admin/users")).toEqual(ROUTE_ROLES["/admin"]);
    expect(getAllowedRolesFor("/owner/audit")).toEqual(ROUTE_ROLES["/owner"]);
  });

  it("không khớp prefix lạ → null", () => {
    expect(getAllowedRolesFor("/khong-ton-tai")).toBeNull();
  });

  it("ADMIN cố ý KHÔNG nằm trong khu đặt phòng", () => {
    expect(ROUTE_ROLES["/booking"]).not.toContain("ADMIN");
  });

  it("khu nghiệp vụ KHÔNG mở cho STUDENT/PARENT", () => {
    expect(ROUTE_ROLES["/admin"]).not.toContain("STUDENT");
    expect(ROUTE_ROLES["/staff"]).not.toContain("STUDENT");
    expect(ROUTE_ROLES["/teacher"]).not.toContain("PARENT");
  });

  it("mọi khu role-gate đều có entry trong ROUTE_ROLES", () => {
    for (const zone of ROLE_GATED_ZONES) {
      expect(ROUTE_ROLES[`/${zone}`], `Thiếu ROUTE_ROLES["/${zone}"]`).toBeTruthy();
    }
  });
});

describe("route-gate coverage (guardrail chống tái phát)", () => {
  it("mọi zone trong (dashboard) phải thuộc đúng 1 trong 3 nhóm bảo vệ", () => {
    for (const zone of zoneDirs()) {
      const categorized =
        ROLE_GATED_ZONES.has(zone) || SHARED_ZONES.has(zone) || PERMISSION_GATED_ZONES.has(zone);
      expect(
        categorized,
        `Zone "/${zone}" chưa được phân loại bảo vệ — thêm vào ROLE_GATED (qua ROLE_HOME), SHARED_ZONES, hoặc PERMISSION_GATED_ZONES.`,
      ).toBe(true);
    }
  });

  it("mọi zone role-gate có layout.tsx gọi guard", () => {
    for (const zone of zoneDirs()) {
      if (!ROLE_GATED_ZONES.has(zone)) continue;
      const layoutPath = join(DASHBOARD_DIR, zone, "layout.tsx");
      expect(existsSync(layoutPath), `Zone "/${zone}" thiếu layout.tsx (route role-gate).`).toBe(true);
      const content = readFileSync(layoutPath, "utf8");
      expect(
        /requirePageZone|requirePageRole/.test(content),
        `layout.tsx của "/${zone}" phải gọi requirePageZone/requirePageRole.`,
      ).toBe(true);
    }
  });

  it("mọi page trong zone permission-gate tự gọi can()/requirePermission", () => {
    for (const zone of PERMISSION_GATED_ZONES) {
      for (const page of pageFiles(zone)) {
        const content = readFileSync(page, "utf8");
        expect(
          /\bcan\(|requirePermission/.test(content),
          `${page} (zone permission-gate "/${zone}") phải tự kiểm tra quyền.`,
        ).toBe(true);
      }
    }
  });
});
