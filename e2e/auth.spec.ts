import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

test.describe("Đăng nhập", () => {
  test("sai mật khẩu → hiện thông báo lỗi, ở lại trang login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ACCOUNTS.admin.email);
    await page.locator("#password").fill("mat-khau-sai");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("đúng thông tin (admin) → điều hướng vào khu /admin", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await expect(page).toHaveURL(/\/admin(\/|$)/);
  });
});
