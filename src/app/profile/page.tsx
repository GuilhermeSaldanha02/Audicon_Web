'use client';

/**
 * Profile (/profile) — R-10 Lote 1
 *
 * Read-only por design: o backend NÃO expõe endpoint de auto-edição de perfil
 * (não há PATCH /users/me nem similar), então nome/email/função/empresa são
 * exibidos como somente-leitura. Os dados vêm do auth-context (claims já
 * hidratados via GET /auth/profile — fonte única, R-08).
 *
 * Segurança: a troca voluntária de senha NÃO é suportada hoje — a página
 * /change-password tem gate que só libera quando mustChangePassword é true
 * (troca forçada). Por isso a seção de Segurança é informativa, não um form.
 *
 * Role gap: claims só distingue isMaster de usuário-de-empresa; não há GERENTE
 * vs FUNCIONARIO no profile (pendente de o backend expor `role`).
 */

import { useRouter } from 'next/navigation';
import { Building2, Shield, KeyRound, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        tabIndex={-1}
        className="w-full cursor-default rounded-md border border-border bg-muted px-3 py-2 text-[13.5px] text-muted-foreground outline-none"
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </RequireAuth>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { claims, logout } = useAuth();

  if (!claims) return null;

  const roleLabel = claims.isMaster ? 'Master' : 'Usuário';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-foreground">
          Meu Perfil
        </h1>
        <p className="mt-0.5 text-[13.5px] text-muted-foreground">
          Informações da sua conta
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Left: identity ─────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3.5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground">
              {initials(claims.nome)}
            </div>
            <div className="text-[18px] font-semibold text-foreground">
              {claims.nome}
            </div>
            <div className="mt-1 break-all text-[13px] text-muted-foreground">
              {claims.email}
            </div>
            <div className="mt-3">
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  claims.isMaster
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-accent-muted text-brand-accent',
                ].join(' ')}
              >
                <Shield className="h-3 w-3" />
                {roleLabel.toUpperCase()}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-left">
              <div className="flex items-center gap-2 text-[13px]">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-[60px] text-muted-foreground">Empresa</span>
                <span className="text-foreground">
                  {claims.companyName ?? (claims.isMaster ? '— (global)' : '—')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-[60px] text-muted-foreground">Função</span>
                <span className="text-foreground">{roleLabel}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 py-2 text-[13.5px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={14} />
              Sair do sistema
            </button>
          </div>
        </div>

        {/* ── Right: details ─────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 text-[13.5px] font-semibold text-foreground">
              Dados pessoais
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Nome completo" value={claims.nome} />
              <ReadonlyField label="E-mail" value={claims.email} />
              <ReadonlyField label="Função" value={roleLabel} />
              <ReadonlyField
                label="Empresa"
                value={claims.companyName ?? (claims.isMaster ? '— (global)' : '—')}
              />
            </div>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Dados somente-leitura. Para alterações cadastrais, contate o
              administrador.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[13.5px] font-semibold text-foreground">
                Segurança
              </h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {claims.isMaster
                ? 'Como usuário Master, a troca de senha é uma operação administrativa — contate o suporte técnico.'
                : 'Para redefinir sua senha, solicite um reset ao administrador da sua empresa. A troca obrigatória ocorre no primeiro acesso.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
