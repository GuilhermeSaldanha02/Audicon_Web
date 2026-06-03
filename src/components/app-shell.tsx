'use client';

/**
 * AppShell — layout autenticado reutilizável (R-10 Lote 1)
 *
 * NOTA DE IMPLEMENTAÇÃO — Role gap:
 * O auth-context expõe claims { nome, email, isMaster, companyId, mustChangePassword, companyName }.
 * NÃO existe um campo `role` (GERENTE vs FUNCIONARIO) no /auth/profile hoje.
 * Portanto:
 *  - MASTER (isMaster === true) → vê navegação master
 *  - Usuário-de-empresa (!isMaster && companyId != null) → vê navegação completa (superset do GERENTE)
 *
 * A separação GERENTE/FUNCIONARIO (ex.: esconder "Funcionários" para FUNCIONARIO)
 * fica pendente de o backend expor `role` no /auth/profile. Sugestão de follow-up:
 * adicionar campo `role: 'ADMIN' | 'MANAGER' | 'RESIDENT'` no ProfileResponseDto
 * e no AuthClaims, então filtrar navItems aqui por role.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Users,
  User,
  FileText,
  LogOut,
  Menu,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number; // placeholder — contagem real em lote futuro
}

function getNavItems(isMaster: boolean): { section: string; items: NavItem[] }[] {
  if (isMaster) {
    return [
      {
        section: 'Principal',
        items: [
          { href: '/master/companies', label: 'Empresas', icon: Building2 },
        ],
      },
      {
        section: 'Sistema',
        items: [
          { href: '/audit-log', label: 'Auditoria', icon: FileText },
          { href: '/profile', label: 'Perfil', icon: User },
        ],
      },
    ];
  }

  // Usuário-de-empresa: mostra superset (GERENTE).
  // TODO: quando o backend expor `role` no /auth/profile, filtrar aqui:
  //   se role === 'EMPLOYEE', remover o item "Funcionários".
  return [
    {
      section: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/condominiums', label: 'Condomínios', icon: Building2 },
        {
          href: '/condominiums',
          label: 'Infrações',
          icon: AlertTriangle,
          // badge: 0 — placeholder; contagem real virá em lote futuro
        },
        { href: '/company/employees', label: 'Funcionários', icon: Users },
      ],
    },
    {
      section: 'Sistema',
      items: [
        { href: '/audit-log', label: 'Auditoria', icon: FileText },
        { href: '/profile', label: 'Perfil', icon: User },
      ],
    },
  ];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { claims, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const isMaster = !!claims?.isMaster;
  const sections = getNavItems(isMaster);
  const userLabel = isMaster
    ? 'Master'
    : claims?.companyName
      ? `Usuário · ${claims.companyName}`
      : 'Usuário';

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ── Overlay (mobile) ────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-[200] flex w-60 flex-col overflow-hidden',
          'bg-[#172554] transition-transform duration-200 ease-in-out',
          // Desktop: always visible; Mobile: slide in/out
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.08] px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2563eb]">
            <Layers size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-none tracking-[-0.01em] text-white whitespace-nowrap">
              Audicon
            </div>
            <div className="text-[11px] font-normal leading-none text-white/50 mt-0.5">
              Gestão de Infrações
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map(({ section, items }) => (
            <div key={section}>
              <div className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">
                {section}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={[
                      'relative flex items-center gap-2.5 px-4 py-2 text-[13.5px] font-medium',
                      'transition-colors duration-[120ms] no-underline whitespace-nowrap',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                    ].join(' ')}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-[2px] bg-[#2563eb]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon size={15} className={isActive ? 'opacity-100' : 'opacity-80'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto min-w-[18px] rounded-full bg-[#2563eb] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div className="shrink-0 border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-white/[0.07]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-semibold text-white">
              {claims?.nome ? getInitials(claims.nome) : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-white">
                {claims?.nome ?? '—'}
              </div>
              <div className="truncate text-[11px] text-white/45">{userLabel}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex shrink-0 items-center justify-center rounded p-1 text-white/50 transition-colors hover:text-white"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────── */}
      <div className="flex flex-1 flex-col lg:ml-60">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-[100] flex h-14 items-center justify-between bg-[#172554] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center rounded-md p-1.5 text-white/70 hover:text-white"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-[15px] font-bold tracking-[-0.01em] text-white">Audicon</span>
          <div className="w-8" aria-hidden="true" />
        </div>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
