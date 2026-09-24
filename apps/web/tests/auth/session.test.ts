import { beforeEach, describe, expect, mock, test } from "bun:test";

let mockUser: { id: string; email: string } | null = null;

mock.module("next/navigation", () => ({
  redirect(url: string): never {
    throw new Error(`redirect:${url}`);
  },
}));

mock.module("../../lib/auth/server-client", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockUser },
        error: mockUser ? null : { message: "no session cookie" },
      }),
    },
  }),
}));

const { getUserId, requireUserId } = await import("../../lib/auth/session");

describe("session helpers", () => {
  beforeEach(() => {
    mockUser = null;
  });

  test("getUserId returns null without a session", async () => {
    expect(await getUserId()).toBeNull();
  });

  test("getUserId returns the verified user id", async () => {
    mockUser = { id: "user-a", email: "a@example.com" };
    expect(await getUserId()).toBe("user-a");
  });

  test("requireUserId redirects to /sign-in when signed out", async () => {
    await expect(requireUserId()).rejects.toThrow("redirect:/sign-in");
  });

  test("requireUserId returns the user id when signed in", async () => {
    mockUser = { id: "user-a", email: "a@example.com" };
    expect(await requireUserId()).toBe("user-a");
  });
});
