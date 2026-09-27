import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getDevBypassUserId } from "@/lib/auth/dev-bypass";
import { safeNextPath } from "@/lib/auth/next-path";

const SIGN_IN_PATH = "/sign-in";

function isPublicPath(pathname: string, hasLangParam: boolean): boolean {
  if (pathname === "/") {
    return !hasLangParam;
  }
  return pathname === SIGN_IN_PATH || pathname.startsWith("/auth");
}

export default async function proxy(request: NextRequest) {
  if (getDevBypassUserId()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() both verifies the session and refreshes expiring cookies onto
  // the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const hasLangParam = request.nextUrl.searchParams.has("lang");

  if (!user && !isPublicPath(pathname, hasLangParam)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = SIGN_IN_PATH;
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === SIGN_IN_PATH) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|webm|woff2?)$).*)",
  ],
};
