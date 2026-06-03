'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2, MapPin, Hash, ChevronRight, AlertCircle, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Condominium, Company } from '@/lib/types';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth-context';

// Base schema for all roles
const condominiumBaseSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  address: z.string().min(5, 'Endereço obrigatório'),
});

// Master adds required companyId
const condominiumMasterSchema = condominiumBaseSchema.extend({
  companyId: z.string().min(1, 'Selecione uma empresa'),
});

type CondominiumBaseForm = z.infer<typeof condominiumBaseSchema>;
type CondominiumMasterForm = z.infer<typeof condominiumMasterSchema>;

export default function CondominiumsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CondominiumsContent />
      </AppShell>
    </RequireAuth>
  );
}

function CondominiumsContent() {
  const router = useRouter();
  const { claims } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const isMaster = claims?.role === 'MASTER';
  const isGerente = claims?.role === 'GERENTE';
  const canCreate = isMaster || isGerente;

  const { data, isLoading, error } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Condominium>>>(
        '/condominiums?page=1&limit=50',
      );
      return res.data.data;
    },
  });

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Condomínios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Condomínios vinculados à sua conta
          </p>
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={
              <Button className="gap-2 cursor-pointer shrink-0" size="sm">
                <Plus className="h-3.5 w-3.5" /> Novo condomínio
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar condomínio</DialogTitle>
              </DialogHeader>
              {isMaster
                ? <CreateCondominiumMasterForm
                    onSuccess={() => {
                      setCreateOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
                    }}
                  />
                : <CreateCondominiumGerenteForm
                    onSuccess={() => {
                      setCreateOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
                    }}
                  />
              }
            </DialogContent>
          </Dialog>
        )}
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
            {canCreate
              ? 'Clique em "Novo condomínio" para criar o primeiro.'
              : 'Você ainda não é membro de nenhum condomínio.'}
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
  );
}

/** Form de criação para GERENTE — não envia companyId (backend usa o do token) */
function CreateCondominiumGerenteForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CondominiumBaseForm>({
    resolver: zodResolver(condominiumBaseSchema),
  });

  const mutation = useApiMutation({
    errorMessage: 'Erro ao criar condomínio',
    mutationFn: async (form: CondominiumBaseForm) => {
      const res = await api.post<ApiEnvelope<Condominium>>('/condominiums', form);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Condomínio criado');
      reset();
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input placeholder="Residencial das Flores" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>CNPJ</Label>
        <Input placeholder="12.345.678/0001-90" {...register('cnpj')} />
        {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Endereço</Label>
        <Input placeholder="Rua Exemplo, 123 — São Paulo, SP" {...register('address')} />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>
      <Button type="submit" className="w-full cursor-pointer" disabled={mutation.isPending}>
        {mutation.isPending ? 'Criando...' : 'Criar condomínio'}
      </Button>
    </form>
  );
}

/** Form de criação para MASTER — exige seleção de empresa (companyId obrigatório) */
function CreateCondominiumMasterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CondominiumMasterForm>({
    resolver: zodResolver(condominiumMasterSchema),
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['master-companies'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Company[]>>('/companies');
      return res.data.data;
    },
  });

  const mutation = useApiMutation({
    errorMessage: 'Erro ao criar condomínio',
    mutationFn: async (form: CondominiumMasterForm) => {
      const res = await api.post<ApiEnvelope<Condominium>>('/condominiums', {
        name: form.name,
        cnpj: form.cnpj,
        address: form.address,
        companyId: Number(form.companyId),
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Condomínio criado');
      reset();
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Empresa</Label>
        <select
          {...register('companyId')}
          disabled={loadingCompanies}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <option value="">{loadingCompanies ? 'Carregando...' : 'Selecione a empresa...'}</option>
          {companies?.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        {errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input placeholder="Residencial das Flores" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>CNPJ</Label>
        <Input placeholder="12.345.678/0001-90" {...register('cnpj')} />
        {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Endereço</Label>
        <Input placeholder="Rua Exemplo, 123 — São Paulo, SP" {...register('address')} />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>
      <Button type="submit" className="w-full cursor-pointer" disabled={mutation.isPending}>
        {mutation.isPending ? 'Criando...' : 'Criar condomínio'}
      </Button>
    </form>
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
