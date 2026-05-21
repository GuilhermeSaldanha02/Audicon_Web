'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  LayoutDashboard,
  ClipboardList,
  LogOut,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function BrandHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMaster, setIsMaster] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    const claims = authStorage.getClaims();
    setIsMaster(!!claims?.isMaster);
    setHasCompany(!claims?.isMaster && !!claims?.companyId);
  }, []);

  const navItems: NavItem[] = [
    ...(isMaster
      ? [{ href: '/master/companies', label: 'Empresas', icon: Building2 }]
      : []),
    ...(!isMaster
      ? [{ href: '/condominiums', label: 'Condomínios', icon: Building2 }]
      : []),
    ...(isMaster || hasCompany
      ? [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/audit-log', label: 'Auditoria', icon: ClipboardList },
        ]
      : []),
  ];

  function handleLogout() {
    authStorage.clear();
    router.replace('/login');
  }

  return (
    <header className="mb-8 flex items-center justify-between">
      {/* Logo + nav */}
      <div className="flex items-center gap-1">
        <Link
          href={isMaster ? '/master/companies' : '/condominiums'}
          className="mr-4 flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Audicon
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && <ChevronRight className="h-3 w-3 opacity-50" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right slot: children, profile, logout */}
      <div className="flex items-center gap-1">
        {children}
        <Link
          href="/profile"
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
            pathname === '/profile'
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <UserCircle className="h-4 w-4" />
          Perfil
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
