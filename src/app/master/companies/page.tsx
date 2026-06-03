'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2, Plus, Hash, Calendar,
  Copy, AlertCircle, Search, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Company, CreateCompanyRequest, CreatedCompanyResult } from '@/lib/types';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';

export default function MasterCompaniesPage() {
  return (
    <RequireAuth role="master">
      <AppShell>
        <MasterCompaniesContent />
      </AppShell>
    </RequireAuth>
  );
}

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(160),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  admin: z.object({
    nome: z.string().min(1, 'Nome do admin obrigatório'),
    email: z.email('E-mail inválido'),
  }),
});
type CreateForm = z.infer<typeof createSchema>;

function MasterCompaniesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<CreatedCompanyResult | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['master-companies'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Company[]>>('/companies');
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const createMutation = useApiMutation({
    errorMessage: 'Erro ao criar empresa',
    mutationFn: async (form: CreateCompanyRequest) => {
      const res = await api.post<ApiEnvelope<CreatedCompanyResult>>('/companies', form);
      return res.data.data;
    },
    onSuccess: (result) => {
      toast.success('Empresa criada');
      setCreateOpen(false);
      setSuccessResult(result);
      reset();
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
    },
  });

  const filtered = data?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search),
  ) ?? [];

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.admin.tempPassword);
    toast.success('Senha copiada');
  }

  return (
    <div className="mx-auto max-w-[var(--content-max,1200px)] px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administradoras que utilizam o sistema
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={
            <Button className="gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da empresa</Label>
                <Input placeholder="Administradora Exemplo Ltda" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input placeholder="12.345.678/0001-90" {...register('cnpj')} />
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
              </div>
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Administrador inicial
                </p>
                <p className="text-xs text-muted-foreground">
                  Será criado com o papel de <strong>Gerente</strong> e receberá uma senha temporária.
                </p>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input placeholder="João da Silva" {...register('admin.nome')} />
                  {errors.admin?.nome && (
                    <p className="text-xs text-destructive">{errors.admin.nome.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="joao@empresa.com" {...register('admin.email')} />
                  {errors.admin?.email && (
                    <p className="text-xs text-destructive">{errors.admin.email.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full cursor-pointer" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar empresa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma empresa cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie a primeira empresa para começar.</p>
        </div>
      )}

      {/* No results for search */}
      {data && data.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma empresa encontrada para &quot;{search}&quot;.
        </p>
      )}

      {/* Table */}
      {data && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Empresa</th>
                  <th className="px-5 py-3 text-left whitespace-nowrap">CNPJ</th>
                  <th className="px-5 py-3 text-left whitespace-nowrap">Criada em</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/master/companies/${company.id}`)}
                    className="border-t border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground leading-snug">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs">
                        <Hash className="h-3 w-3" />
                        {company.cnpj}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
            {filtered.length} empresa(s)
            {search && data && filtered.length < data.length && ` · filtrando de ${data.length}`}
          </div>
        </div>
      )}

      {/* Success modal — shows tempPassword after company creation */}
      <Dialog open={!!successResult} onOpenChange={(o) => !o && setSuccessResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empresa criada com sucesso</DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-900">
                  <strong>{successResult.company.name}</strong> cadastrada (CNPJ {successResult.company.cnpj}).
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Credenciais do administrador (Gerente)
                </p>
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Nome:</span>{' '}
                    <span className="font-medium">{successResult.admin.nome}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">E-mail:</span>{' '}
                    <span className="font-mono">{successResult.admin.email}</span>
                  </p>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Senha temporária:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base border border-border">
                        {successResult.admin.tempPassword}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyPassword} className="gap-1.5 cursor-pointer">
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Anote esta senha. Por segurança, ela não será exibida novamente.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setSuccessResult(null)} className="cursor-pointer">Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
