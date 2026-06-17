import { type Page } from "@playwright/test";

/** Tài khoản seed (chỉ dùng cho môi trường dev/local — xem prisma/seed.ts). */
export const ACCOUNTS = {
  admin: { email: "admin@eduassess.vn", password: "Admin123!" },
  cbdts: { email: "cbdts1@eduassess.vn", password: "Staff123!" }, // có quyền class.create
  teacher: { email: "gv.toan1@eduassess.vn", password: "Teacher123!" },
  // hs0005 ghi danh lớp demo nhưng KHÔNG có lượt làm seed sẵn ⇒ làm bài "sạch".
  student: { email: "hs0005@eduassess.vn", password: "Student123!" },
} as const;

/** Sau đăng nhập, /dashboard redirect về trang chủ theo role. */
const ROLE_HOME = /\/(owner|admin|staff|teacher|student|parent)(\/|$|\?)/;

/** Đăng nhập qua form thật và chờ điều hướng về dashboard theo role. */
export async function login(page: Page, acc: { email: string; password: string }) {
  await page.goto("/login");
  await page.locator("#email").fill(acc.email);
  await page.locator("#password").fill(acc.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  // Dev biên dịch route đích ở lần đầu (có thể >30s với khu /admin) → để rộng tay.
  await page.waitForURL(ROLE_HOME, { timeout: 90_000 });
}
