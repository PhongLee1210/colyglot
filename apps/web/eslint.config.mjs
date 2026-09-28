import nextConfig from "@colyglot/eslint-config/next";
import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "The data layer is internal — import from '@/lib/db/repositories' instead.",
            },
            {
              name: "@/lib/db/index",
              message:
                "The data layer is internal — import from '@/lib/db/repositories' instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/auth/server-client",
              message:
                "Server-only — client components must go through server actions in '@/lib/actions'.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
