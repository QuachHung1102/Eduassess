import { describe, expect, it } from "vitest";
import { allowedGroupRoles, canSendMyStudents, validateTarget, type Sender } from "@/lib/notifications/targeting";

const admin: Sender = { id: "a", role: "ADMIN", staffPosition: null };
const owner: Sender = { id: "o", role: "OWNER", staffPosition: null };
const nvlt: Sender = { id: "n", role: "STAFF", staffPosition: "NVLT" };
const cbdt: Sender = { id: "c", role: "STAFF", staffPosition: "CBDT" };
const cbdts: Sender = { id: "cs", role: "STAFF", staffPosition: "CBDTS" };

describe("allowedGroupRoles", () => {
  it("ADMIN/OWNER gửi mọi nhóm", () => {
    expect(allowedGroupRoles(admin).sort()).toEqual(["PARENT", "STAFF", "STUDENT", "TEACHER"]);
    expect(allowedGroupRoles(owner)).toContain("STUDENT");
  });
  it("NVLT chỉ nhóm Nhân viên", () => {
    expect(allowedGroupRoles(nvlt)).toEqual(["STAFF"]);
  });
  it("CBDT không gửi theo nhóm", () => {
    expect(allowedGroupRoles(cbdt)).toEqual([]);
  });
});

describe("canSendMyStudents", () => {
  it("chỉ CBDT", () => {
    expect(canSendMyStudents(cbdt)).toBe(true);
    expect(canSendMyStudents(cbdts)).toBe(false);
    expect(canSendMyStudents(admin)).toBe(false);
  });
});

describe("validateTarget", () => {
  it("admin gửi nhóm HS ⇒ OK", () => {
    expect(validateTarget(admin, { kind: "groups", roles: ["STUDENT"] })).toBeNull();
  });
  it("NVLT gửi nhóm Nhân viên OK, nhóm HS bị chặn", () => {
    expect(validateTarget(nvlt, { kind: "groups", roles: ["STAFF"] })).toBeNull();
    expect(validateTarget(nvlt, { kind: "groups", roles: ["STUDENT"] })).not.toBeNull();
  });
  it("CBDT không gửi nhóm; gửi HS của tôi OK", () => {
    expect(validateTarget(cbdt, { kind: "groups", roles: ["STUDENT"] })).not.toBeNull();
    expect(validateTarget(cbdt, { kind: "my-students" })).toBeNull();
  });
  it("admin không dùng my-students", () => {
    expect(validateTarget(admin, { kind: "my-students" })).not.toBeNull();
  });
  it("gửi cá nhân: cần ít nhất 1 người", () => {
    expect(validateTarget(nvlt, { kind: "users", userIds: ["u1"] })).toBeNull();
    expect(validateTarget(nvlt, { kind: "users", userIds: [] })).not.toBeNull();
  });
  it("nhóm rỗng ⇒ lỗi", () => {
    expect(validateTarget(admin, { kind: "groups", roles: [] })).not.toBeNull();
  });
});
