export const DEV_BYPASS_EMAIL = "dev@colyglot.local";

export function getDevBypassUserId(): string | null {
  const userId = process.env.DEV_BYPASS_USER_ID;
  if (
    !userId ||
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "test"
  ) {
    return null;
  }
  return userId;
}
