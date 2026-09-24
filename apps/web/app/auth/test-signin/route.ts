import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return NextResponse.json({ error: "Sign-in failed" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(next, origin));
}
