import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const M3_PREFIX = "/m3";
const DESIGN_COOKIE = "design_mode";

function shouldUseM3(req: NextRequest): boolean {
  const cookieValue = req.cookies.get(DESIGN_COOKIE)?.value;
  if (cookieValue === "m3") return true;
  if (cookieValue === "legacy") return false;
  return process.env.NEXT_PUBLIC_UI_V2 === "true";
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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  // Design mode rewrite (po odświeżeniu sesji)
  if (shouldUseM3(request)) {
    const { pathname } = request.nextUrl;
    const shouldRewrite =
      pathname === "/" ||
      pathname === "/exercises" ||
      pathname.startsWith("/exercises/");

    if (shouldRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = `${M3_PREFIX}${pathname === "/" ? "" : pathname}`;
      const rewriteResponse = NextResponse.rewrite(url);
      // Zachowaj cookies z Supabase (np. odświeżona sesja)
      supabaseResponse.cookies
        .getAll()
        .forEach((cookie) =>
          rewriteResponse.cookies.set(cookie.name, cookie.value),
        );
      return rewriteResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    String.raw`/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`,
  ],
};
