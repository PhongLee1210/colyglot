import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { DEV_BYPASS_EMAIL, getDevBypassUserId } from "./dev-bypass";
import { createSupabaseServerClient } from "./server-client";

export type SessionUser = {
  id: string;
  email?: string | null;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const devBypassUserId = getDevBypassUserId();
  if (devBypassUserId) {
    return { id: devBypassUserId, email: DEV_BYPASS_EMAIL };
  }

  const supabase = await createSupabaseServerClient();

  // getUser() verifies the JWT with Supabase; getSession() alone is not
  // trustworthy for authorization decisions.
  const { data, error } = await supabase.auth.getUser();

  return error ? null : data.user;
});

export async function getUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}
