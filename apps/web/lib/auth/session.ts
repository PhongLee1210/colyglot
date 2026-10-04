import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "./server-client";

export type SessionUser = {
  id: string;
  email?: string | null;
  isAnonymous: boolean;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();

  // getUser() verifies the JWT with Supabase; getSession() alone is not
  // trustworthy for authorization decisions.
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }
  return {
    id: data.user.id,
    email: data.user.email,
    isAnonymous: data.user.is_anonymous ?? false,
  };
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
