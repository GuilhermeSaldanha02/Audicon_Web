import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de proteção de rotas (server-side, edge runtime).
 *
 * Em desenvolvimento (same-origin): verifica a presença do cookie `access_token`
 * (httpOnly, gerado pelo back-end no login — R-08). Sem cookie → redireciona para
 * /login.
 *
 * Em produção (cross-origin: Vercel + Railway): o cookie é setado pelo domínio da
 * API (*.up.railway.app) e NÃO é enviado ao edge da Vercel — o middleware nunca o
 * enxerga. A proteção real vem do back-end (valida JWT a cada request) e do
 * <RequireAuth> (redirect client-side se /auth/profile retornar 401).
 */

const PUBLIC_PATHS = ['/login'];

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Whitelist: rotas públicas passam direto, independente do cookie.
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Em produção cross-origin o cookie não chega ao edge — delega ao <RequireAuth>.
  if (IS_PRODUCTION) {
    return NextResponse.next();
  }

  // Verifica apenas a presença do cookie access_token (dev, same-origin).
  const hasToken = Boolean(request.cookies.get('access_token'));

  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher: o middleware só roda nas rotas da aplicação.
 * Exclui explicitamente assets do Next.js e arquivos estáticos comuns para não
 * penalizar performance e evitar falsos redirects.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
