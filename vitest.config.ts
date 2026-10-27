import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    include: [
      "app/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "features/**/*.test.{ts,tsx}",
      "hooks/**/*.test.{ts,tsx}",
      "stores/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
    ],
  },
})
