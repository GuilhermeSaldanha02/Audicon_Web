'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mail, Shield, Building2, KeyRound } from 'lucide-react';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { BrandHeader } from '@/components/brand-header';

type ProfileData = {
  nome: string;
  email: string;
  isMaster: boolean;
  companyName: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    if (!authStorage.get()) router.replace('/login');
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<ProfileData>>('/auth/profile');
      return res.data.data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <BrandHeader />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Informações da sua conta</p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Identity card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-5 bg-primary/5 px-6 py-6 border-b border-border">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shrink-0">
                  {initials(data.nome)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground truncate">{data.nome}</h2>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{data.email}</span>
                  </div>
                  <div className="mt-2">
                    {data.isMaster ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <Shield className="h-3 w-3" /> Master
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        <Shield className="h-3 w-3" /> Administrador
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {data.companyName && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Empresa
                      </p>
                      <p className="text-sm font-medium text-foreground">{data.companyName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Segurança</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.isMaster
                  ? 'Como usuário master, entre em contato com o suporte técnico para alterar sua senha.'
                  : 'Para alterar sua senha, solicite um reset de senha ao administrador da sua empresa.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
