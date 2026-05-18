'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authStorage } from '@/lib/auth';

export function BrandHeader({ children }: { children?: React.ReactNode }) {
  const [isMaster, setIsMaster] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  useEffect(() => {
    const claims = authStorage.getClaims();
    setIsMaster(!!claims?.isMaster);
    setHasCompany(!claims?.isMaster && !!claims?.companyId);
  }, []);

  return (
    <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
      <div className="flex items-center gap-6">
        <Link
          href={isMaster ? '/master/companies' : '/condominiums'}
          className="flex items-center"
        >
          <Image
            src="/logo.png"
            alt="Audicon Condomínios"
            width={140}
            height={48}
            className="h-auto w-[140px]"
            priority
          />
        </Link>
        {isMaster && (
          <Link
            href="/master/companies"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            🏢 Empresas
          </Link>
        )}
        {hasCompany && (
          <Link
            href="/company/employees"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            👥 Funcionários
          </Link>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
