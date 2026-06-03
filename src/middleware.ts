import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de proteção de rotas (server-side, edge runtime).
 *
 * Estratégia: verifica APENAS a PRESENÇA do cookie `access_token` (httpOnly,
 * gerado pelo back-end no login — R-08). NÃO decodifica nem valida o JWT, pois:
 *   1. A secret não está disponível no edge.
 *   2. Validar aqui anularia o benefício do httpOnly (exposição a timing attacks
 *      no edge vs. validação isolada no back-end).
 *
 * A validação real do token ocorre no back-end a cada request autenticado.
 * O <RequireAuth> continua como segunda camada client-side (verificação de
 * papel/claims) — este middleware não o substitui.
 *
 * Fluxo:
 *   - Rotas públicas (whitelist) → passa direto.
 *   - Demais rotas sem cookie → redireciona para /login.
 *   - Demais rotas com cookie → passa para renderização normal.
 */

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Whitelist: rotas públicas passam direto, independente do cookie.
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Verifica apenas a presença do cookie access_token.
  const hasToken = Boolean(request.cookies.get('access_token'));

  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    // Preserva a rota de origem para redirect pós-login (opcional, útil para UX).
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
