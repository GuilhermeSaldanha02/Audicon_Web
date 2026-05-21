'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, MapPin, Hash, ChevronRight, AlertCircle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Condominium } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

export default function CondominiumsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authStorage.get()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Condominium>>>(
        '/condominiums?page=1&limit=20',
      );
      return res.data.data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus condomínios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Condomínios vinculados à sua conta
          </p>
        </div>

        {/* Busca */}
        {(data?.data?.length ?? 0) > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome, CNPJ ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* States */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Erro ao carregar condomínios. Tente novamente.
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum condomínio ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você ainda não é membro de nenhum condomínio.
            </p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <CondominiumGrid
            condominiums={data.data}
            search={search}
            total={data.total}
            page={data.page}
            limit={data.limit}
            onNavigate={(id) => router.push(`/condominiums/${id}`)}
          />
        )}
      </div>
    </div>
  );
}

function CondominiumGrid({
  condominiums, search, total, page, limit, onNavigate,
}: {
  condominiums: Condominium[];
  search: string;
  total: number;
  page: number;
  limit: number;
  onNavigate: (id: number) => void;
}) {
  const filtered = condominiums.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.cnpj.includes(q) || c.address.toLowerCase().includes(q);
  });

  return (
    <>
      {search && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum condomínio encontrado para &quot;{search}&quot;.
        </p>
      )}
      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-accent/30 hover:shadow-md"
              onClick={() => onNavigate(c.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </div>
                <h3 className="font-semibold text-foreground leading-snug mb-3">{c.name}</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />{c.cnpj}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Total: {total} · Página {page} de {Math.max(1, Math.ceil(total / limit))}
      </p>
    </>
  );
}
