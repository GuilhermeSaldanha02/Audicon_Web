'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, FileDown, AlertTriangle, FileText, ChevronRight,
  Search, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Infraction, Unit, InfractionStatus, InfractionSeverity, Condominium } from '@/lib/types';
import { SeverityBadge } from '@/components/severity-badge';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth-context';

const STATUS_LABEL: Record<InfractionStatus, string> = {
  pending: 'Pendente',
  analyzed: 'Analisado',
  approved: 'Aprovado',
  sent: 'Enviado',
};

const STATUS_BADGE_CLASS: Record<InfractionStatus, string> = {
  pending:  'bg-[var(--st-aberta-bg)] text-[var(--st-aberta)]',
  analyzed: 'bg-[var(--st-analise-bg)] text-[var(--st-analise)]',
  approved: 'bg-[var(--st-notificada-bg)] text-[var(--st-notificada)]',
  sent:     'bg-[var(--st-fechada-bg)] text-[var(--st-fechada)]',
};

const SEVERITY_OPTIONS: { value: InfractionSeverity; label: string }[] = [
  { value: 'LEVE',  label: 'Leve' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'GRAVE', label: 'Grave' },
];

const infractionSchema = z.object({
  description: z.string().min(10, 'Descreva a infração com pelo menos 10 caracteres'),
  unitId: z.string().min(1, 'Selecione uma unidade'),
  severity: z.enum(['LEVE', 'MEDIA', 'GRAVE'] as const, { error: 'Selecione a gravidade' }),
});
type InfractionForm = z.infer<typeof infractionSchema>;

export default function CondominiumInfractionsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <InfractionsContent />
      </AppShell>
    </RequireAuth>
  );
}

function InfractionsContent() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const canCreate = claims?.role === 'GERENTE' || claims?.role === 'FUNCIONARIO';

  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InfractionStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<InfractionSeverity | ''>('');
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Fetch condominium info for breadcrumb
  const { data: condominium } = useQuery({
    queryKey: ['condominium', condominiumId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Condominium>>(`/condominiums/${condominiumId}`);
      return res.data.data;
    },
  });

  // Fetch units for the filter/create selects
  const { data: units } = useQuery({
    queryKey: ['units', condominiumId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Unit[]>>(`/condominiums/${condominiumId}/units`);
      return res.data.data;
    },
  });

  // Fetch infractions filtered by selected unit (or first unit if none selected)
  // Backend only supports unitId filter; no condo-level filter exists.
  // We show a unit selector; if no unit selected, we try to show all by fetching per-unit aggregation.
  const selectedUnitId = unitFilter || (units && units.length > 0 ? String(units[0].id) : '');

  const { data: infractions, isLoading } = useQuery({
    queryKey: ['infractions-condo', condominiumId, selectedUnitId, page],
    queryFn: async () => {
      if (!selectedUnitId) return { data: [], total: 0, page: 1, limit: LIMIT };
      const res = await api.get<ApiEnvelope<PaginatedResult<Infraction>>>(
        `/infractions?unitId=${selectedUnitId}&page=${page}&limit=${LIMIT}`,
      );
      return res.data.data;
    },
    enabled: !!selectedUnitId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InfractionForm>({
    resolver: zodResolver(infractionSchema),
  });

  const createMutation = useApiMutation({
    errorMessage: 'Erro ao registrar infração',
    mutationFn: async (form: InfractionForm) => {
      const res = await api.post<ApiEnvelope<Infraction>>('/infractions', {
        description: form.description,
        unitId: Number(form.unitId),
        severity: form.severity,
      });
      return res.data.data;
    },
    onSuccess: (inf) => {
      toast.success('Infração registrada');
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
      setOpen(false);
      reset();
      router.push(`/condominiums/${condominiumId}/infractions/${inf.id}`);
    },
  });

  async function handleExportCsv() {
    setExporting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const params = new URLSearchParams();
      if (selectedUnitId) params.set('unitId', selectedUnitId);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${baseUrl}/infractions/export?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infractions-condo-${condominiumId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExporting(false);
    }
  }

  // Client-side status/severity filter (unit is already server-filtered)
  // Note: severity filter is client-side; backend does not support filtering by severity.
  const filtered = infractions?.data.filter((inf) => {
    const matchStatus = !statusFilter || inf.status === statusFilter;
    const matchSeverity = !severityFilter || inf.severity === severityFilter;
    const matchSearch = !search ||
      inf.description.toLowerCase().includes(search.toLowerCase()) ||
      String(inf.id).includes(search);
    return matchStatus && matchSeverity && matchSearch;
  }) ?? [];

  const totalPages = infractions ? Math.max(1, Math.ceil(infractions.total / LIMIT)) : 1;

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <button
          onClick={() => router.push('/condominiums')}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          Condomínios
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          onClick={() => router.push(`/condominiums/${condominiumId}`)}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          {condominium?.name ?? '...'}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Infrações</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline" size="sm"
          onClick={() => router.push(`/condominiums/${condominiumId}`)}
          className="gap-1.5 cursor-pointer mt-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Infrações</h1>
          {condominium && (
            <p className="text-sm text-muted-foreground mt-0.5">{condominium.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="gap-1.5 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={
                <Button className="gap-2 cursor-pointer" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Nova infração
                </Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar infração</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Unidade</Label>
                    <select
                      {...register('unitId')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Selecione a unidade...</option>
                      {units?.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.identifier} — {u.ownerName}
                        </option>
                      ))}
                    </select>
                    {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gravidade</Label>
                    <select
                      {...register('severity')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Selecione a gravidade...</option>
                      {SEVERITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {errors.severity && <p className="text-xs text-destructive">{errors.severity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição da ocorrência</Label>
                    <Textarea
                      placeholder="Descreva o que aconteceu..."
                      rows={4}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Registrando...' : 'Registrar infração'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descrição ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={unitFilter}
            onChange={(e) => { setUnitFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {units && units.length > 0 && (
              <>
                <option value="">Unidade: {units[0]?.identifier}</option>
                {units.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.identifier} — {u.ownerName}
                  </option>
                ))}
              </>
            )}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as InfractionStatus | ''); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as InfractionStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as InfractionSeverity | ''); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas as gravidades</option>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}

      {/* No units yet */}
      {!isLoading && units && units.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma unidade cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre unidades no condomínio para registrar infrações.
          </p>
        </div>
      )}

      {/* Empty infractions */}
      {!isLoading && infractions && infractions.data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma infração registrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em &quot;Nova infração&quot; para registrar a primeira ocorrência.
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Data</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Gravidade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inf) => (
                  <tr
                    key={inf.id}
                    onClick={() => router.push(`/condominiums/${condominiumId}/infractions/${inf.id}`)}
                    className="border-t border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{inf.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground line-clamp-2 leading-snug">{inf.description}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {inf.occurrenceDate
                        ? new Date(inf.occurrenceDate).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <SeverityBadge severity={inf.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASS[inf.status]}`}>
                        {STATUS_LABEL[inf.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {infractions?.total} infração(ões) · Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="cursor-pointer"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="cursor-pointer"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
          {totalPages <= 1 && (
            <p className="text-xs text-muted-foreground">
              {infractions?.total ?? filtered.length} infração(ões)
            </p>
          )}
        </>
      )}

      {/* Search no results */}
      {!isLoading && infractions && infractions.data.length > 0 && filtered.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-6">
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Nenhuma infração encontrada com os filtros aplicados.
          </p>
        </div>
      )}
    </div>
  );
}
