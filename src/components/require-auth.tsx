'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type Role = 'master' | 'gerente';

/**
 * Guarda de rota client-side. Centraliza o padrão antes repetido em ~9 páginas
 * (useEffect + getClaims + router.replace).
 *
 * - sem `role`: exige apenas estar autenticado.
 * - `role="master"`: exige `isMaster`; caso contrário manda para /condominiums.
 * - `role="gerente"`: exige `claims.role === 'GERENTE'`; master vai para
 *   /master/companies; não-gerente de empresa vai para /dashboard.
 *
 * Enquanto o estado de auth não hidratou, ou enquanto redireciona, não renderiza
 * o conteúdo protegido (evita flash de tela indevida).
 */
export function RequireAuth({
  role,
  children,
}: {
  role?: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { claims, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (role === 'master' && !claims.isMaster) {
      router.replace('/condominiums');
      return;
    }
    if (role === 'gerente' && claims.role !== 'GERENTE') {
      router.replace(claims.isMaster ? '/master/companies' : '/dashboard');
      return;
    }
  }, [ready, claims, role, router]);

  if (!ready || !claims) return null;
  if (role === 'master' && !claims.isMaster) return null;
  if (role === 'gerente' && claims.role !== 'GERENTE') return null;

  return <>{children}</>;
}
