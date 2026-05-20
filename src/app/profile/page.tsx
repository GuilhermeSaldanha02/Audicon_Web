'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Shield, Building2, Hash } from 'lucide-react';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { BrandHeader } from '@/components/brand-header';

type ProfileData = {
  id: number;
  nome: string;
  email: string;
  isMaster: boolean;
  companyId: number | null;
};

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

  const claims = authStorage.getClaims();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Informações da sua conta</p>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-32 rounded-xl bg-muted animate-pulse" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Identity card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{data.nome}</h2>
                  <p className="text-sm text-muted-foreground">{data.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    ID do usuário
                  </p>
                  <div className="flex items-center gap-2 text-foreground">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{data.id}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Tipo de conta
                  </p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    {data.isMaster ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Master
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        Administrador
                      </span>
                    )}
                  </div>
                </div>

                {data.companyId && (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Empresa
                    </p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-sm">ID #{data.companyId}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3">Segurança</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para alterar sua senha, solicite um reset ao seu administrador.
                {claims?.isMaster && ' Como master, entre em contato com o suporte técnico.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
