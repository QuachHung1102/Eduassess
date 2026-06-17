import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test("CBDTS mở được trang tạo lớp học", async ({ page }) => {
  await login(page, ACCOUNTS.cbdts);

  await page.goto("/staff/classes/new");

  // Trang tải được (không bị đá về /staff) và form tạo lớp hiển thị.
  await expect(page.getByRole("heading", { name: "Tạo lớp học mới" })).toBeVisible();
  await expect(page.getByText("Dựng khung lịch tuần")).toBeVisible();
  await expect(page).toHaveURL(/\/staff\/classes\/new/);
});
