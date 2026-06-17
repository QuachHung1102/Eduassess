import type { Rng } from "./rng";

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const DEM = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Quang", "Thu", "Thanh", "Ngọc", "Gia", "Khánh", "Bảo"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Hà", "Hải", "Hùng", "Lan", "Linh", "Mai", "Nam", "Nga", "Phúc", "Quân", "Sơn", "Trang", "Tú", "Vy", "Yến", "Anh", "Khoa", "Long", "Phương", "Thảo"];

export function genName(rng: Rng): string {
  return `${rng.pick(HO)} ${rng.pick(DEM)} ${rng.pick(TEN)}`;
}

export type GenProfile = {
  name: string;
  email: string;
  sex: "MALE" | "FEMALE";
  dateOfBirth: Date;
  phoneNumber: string;
};

function phone(rng: Rng): string {
  return `09${String(rng.int(10000000, 99999999))}`;
}

export function genStudent(i: number, rng: Rng): GenProfile {
  return {
    name: genName(rng),
    email: `hs${String(i).padStart(4, "0")}@eduassess.vn`,
    sex: rng.bool() ? "MALE" : "FEMALE",
    dateOfBirth: new Date(Date.UTC(2008 - rng.int(0, 3), rng.int(0, 11), rng.int(1, 28))),
    phoneNumber: phone(rng),
  };
}

export function genTeacher(i: number, rng: Rng): GenProfile {
  return {
    name: genName(rng),
    email: `gv${String(i).padStart(3, "0")}@eduassess.vn`,
    sex: rng.bool() ? "MALE" : "FEMALE",
    dateOfBirth: new Date(Date.UTC(1985 - rng.int(0, 10), rng.int(0, 11), rng.int(1, 28))),
    phoneNumber: phone(rng),
  };
}
