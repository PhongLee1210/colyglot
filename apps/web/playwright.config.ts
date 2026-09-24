import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3117",
    hasTouch: true,
    viewport: { width: 430, height: 932 },
  },
  webServer: {
    command: "bun run start --port 3117",
    port: 3117,
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      E2E_SIGNIN_TOKEN: "colyglot-e2e",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth-setup\.ts/,
    },
    {
      name: "signed-in",
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/user.json",
      },
      testIgnore: [/auth-setup\.ts/, /auth\.spec\.ts/],
    },
    {
      name: "anonymous",
      testMatch: /auth\.spec\.ts/,
    },
  ],
});
