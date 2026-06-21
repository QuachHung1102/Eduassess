import { describe, expect, it } from "vitest";
import { canAdministerClass, canOperateClassSession } from "@/lib/classes/access";

const owner = { id: "o", role: "OWNER", staffPosition: null } as const;
const admin = { id: "a", role: "ADMIN", staffPosition: null } as const;
const advisor = { id: "adv", role: "STAFF", staffPosition: "CBDT" } as const;
const otherCbdt = { id: "cbdt2", role: "STAFF", staffPosition: "CBDT" } as const;
const cbdts = { id: "sup", role: "STAFF", staffPosition: "CBDTS" } as const;
const teacher = { id: "t1", role: "TEACHER", staffPosition: null } as const;
const otherTeacher = { id: "t2", role: "TEACHER", staffPosition: null } as const;

describe("canAdministerClass — quản trị lớp (xếp buổi, tuyển sinh, sửa lớp)", () => {
  const cls = { advisorId: "adv" };
  it("OWNER/ADMIN luôn được", () => {
    expect(canAdministerClass(owner, cls)).toBe(true);
    expect(canAdministerClass(admin, cls)).toBe(true);
  });
  it("CBĐT phụ trách lớp được", () => {
    expect(canAdministerClass(advisor, cls)).toBe(true);
  });
  it("CBĐT khác KHÔNG quản lớp không phụ trách", () => {
    expect(canAdministerClass(otherCbdt, cls)).toBe(false);
  });
  it("CBDTS không tự động quản lớp người khác", () => {
    expect(canAdministerClass(cbdts, cls)).toBe(false);
  });
  it("GV không quản trị lớp", () => {
    expect(canAdministerClass(teacher, cls)).toBe(false);
  });
});

describe("canOperateClassSession — điểm danh / đánh giá buổi", () => {
  const ctx = { advisorId: "adv", teacherIds: ["t1"], sessionTeacherId: "t3" };
  it("OWNER/ADMIN/CBDTS được", () => {
    expect(canOperateClassSession(owner, ctx)).toBe(true);
    expect(canOperateClassSession(cbdts, ctx)).toBe(true);
  });
  it("CBĐT phụ trách lớp được", () => {
    expect(canOperateClassSession(advisor, ctx)).toBe(true);
  });
  it("GV của lớp được", () => {
    expect(canOperateClassSession(teacher, ctx)).toBe(true);
  });
  it("GV dạy chính buổi đó được (dù không trong danh sách GV lớp)", () => {
    expect(canOperateClassSession({ id: "t3", role: "TEACHER", staffPosition: null }, ctx)).toBe(true);
  });
  it("GV / CBĐT không liên quan KHÔNG được", () => {
    expect(canOperateClassSession(otherTeacher, ctx)).toBe(false);
    expect(canOperateClassSession(otherCbdt, ctx)).toBe(false);
  });
});
