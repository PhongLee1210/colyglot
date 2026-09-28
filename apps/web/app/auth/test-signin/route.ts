import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { resetUserData } from "@/lib/db/repositories/user-data";

const TEST_EMAIL_DOMAIN = "@colyglot.test";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email") ?? "";
  const password = searchParams.get("password") ?? "";
  const next = safeNextPath(searchParams.get("next"));

  if (
    !process.env.E2E_SIGNIN_TOKEN ||
    token !== process.env.E2E_SIGNIN_TOKEN ||
    !email.endsWith(TEST_EMAIL_DOMAIN)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: "Sign-in failed" }, { status: 401 });
  }
  if (searchParams.get("reset") === "1") {
    await resetUserData(data.user.id);
  }
  return NextResponse.redirect(new URL(next, origin));
}
