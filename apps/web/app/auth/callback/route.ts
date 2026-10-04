import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { promoteToStandard } from "@/lib/db/repositories/user-account";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // One place covers magic link, Google, and the anonymous upgrade
      // confirmation: any confirmed-email, non-anonymous session is
      // STANDARD — on the same uuid, so progress carries over.
      if (data.user?.email && !data.user.is_anonymous) {
        await promoteToStandard(data.user.id);
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const signInUrl = new URL("/sign-in", origin);
  signInUrl.searchParams.set("error", "callback");
  return NextResponse.redirect(signInUrl);
}
