import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "./server-client";

export const getCurrentUser = cache(async () => {
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
