import { defineConfig } from "vitest/config";

// Test logic nghiệp vụ thuần (không chạm DB/React).
// Alias "@/*" lấy trực tiếp từ tsconfig qua resolve.tsconfigPaths (native Vite).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
