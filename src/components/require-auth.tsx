'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type Role = 'master' | 'company';

/**
 * Guarda de rota client-side. Centraliza o padrão antes repetido em ~9 páginas
 * (useEffect + getClaims + router.replace).
 *
 * - sem `role`: exige apenas estar autenticado.
 * - `role="master"`: exige `isMaster`; caso contrário manda para /condominiums.
 * - `role="company"`: exige admin de empresa (não-master com companyId);
 *   master é mandado para /master/companies.
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
    if (role === 'company' && (claims.isMaster || !claims.companyId)) {
      router.replace(claims.isMaster ? '/master/companies' : '/condominiums');
    }
  }, [ready, claims, role, router]);

  if (!ready || !claims) return null;
  if (role === 'master' && !claims.isMaster) return null;
  if (role === 'company' && (claims.isMaster || !claims.companyId)) return null;

  return <>{children}</>;
}
