import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

const PRACTICE_TITLE = "Luyện tập Đại số 10 (demo)";

test("học sinh làm bài luyện tập và nhận điểm", async ({ page }) => {
  await login(page, ACCOUNTS.student);

  // 1) Vào danh sách bài kiểm tra (tab "Chờ làm").
  await page.goto("/student/exams");
  await expect(page.getByRole("heading", { name: "Bài kiểm tra" })).toBeVisible();

  // 2) Bấm "Bắt đầu" ở thẻ đề luyện tập (không hạn nộp ⇒ luôn làm được).
  const card = page.locator("div.bg-white", { hasText: PRACTICE_TITLE });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Bắt đầu" }).click();

  // 3) Vào trang làm bài.
  await page.waitForURL(/\/student\/exams\/.+\/take/, { timeout: 30_000 });
  await expect(page.getByText(/Câu 1\//)).toBeVisible();

  // 4) Chọn đáp án đầu tiên cho câu hiện tại.
  await page.locator(".space-y-2\\.5 > button").first().click();

  // 5) Nộp bài (nút header) → xác nhận trong hộp thoại.
  await page.getByRole("button", { name: "Nộp bài", exact: true }).first().click();
  const dialog = page.locator("div.fixed.inset-0");
  await expect(dialog.getByRole("heading", { name: "Xác nhận nộp bài" })).toBeVisible();
  await dialog.getByRole("button", { name: "Nộp bài", exact: true }).click();

  // 6) Về trang kết quả.
  await page.waitForURL(/\/student\/exams\/.+\/results\/.+/, { timeout: 30_000 });
});
