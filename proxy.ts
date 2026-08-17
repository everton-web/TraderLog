import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const defaultResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login')
    || pathname.startsWith('/cadastro')
    || pathname.startsWith('/esqueci-senha')
    || pathname.startsWith('/redefinir-senha')
    || pathname.startsWith('/auth/callback')
    || pathname.startsWith('/onboarding');

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const skipRedirectWhenLoggedIn = pathname.startsWith('/redefinir-senha')
      || pathname.startsWith('/auth/callback');
    if (user && isAuthRoute && !skipRedirectWhenLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    // Se o Supabase falhar por qualquer motivo, trata como não autenticado
    if (!isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return defaultResponse;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
