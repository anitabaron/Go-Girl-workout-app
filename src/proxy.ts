import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LEGACY_PREFIX = "/legacy/workout-plan";
const DESIGN_COOKIE = "design_mode";

function shouldUseLegacy(req: NextRequest): boolean {
  return req.cookies.get(DESIGN_COOKIE)?.value === "legacy";
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  // When design_mode=legacy and user hits main app paths, rewrite to legacy routes
  if (shouldUseLegacy(request)) {
    const { pathname } = request.nextUrl;
    const isMainAppPath =
      pathname === "/" ||
      pathname.startsWith("/exercises") ||
      pathname.startsWith("/workout-plans") ||
      pathname.startsWith("/workout-sessions") ||
      pathname.startsWith("/personal-records") ||
      pathname === "/import-instruction" ||
      pathname === "/kitchen-sink" ||
      pathname === "/test";

    if (isMainAppPath) {
      const url = request.nextUrl.clone();
      url.pathname =
        pathname === "/" ? LEGACY_PREFIX : `${LEGACY_PREFIX}${pathname}`;
      const rewriteResponse = NextResponse.rewrite(url);
      supabaseResponse.cookies
        .getAll()
        .forEach((cookie) =>
          rewriteResponse.cookies.set(cookie.name, cookie.value)
        );
      return rewriteResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Plain string instead of String.raw – SonarQube + Next.js static extraction
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
