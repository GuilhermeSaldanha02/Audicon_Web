'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, FileDown, AlertTriangle, FileText, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Infraction, Unit, InfractionStatus } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const STATUS_LABEL: Record<InfractionStatus, string> = {
  pending: 'Pendente',
  analyzed: 'Analisado',
  approved: 'Aprovado',
  sent: 'Enviado',
};

const STATUS_BADGE: Record<InfractionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  analyzed: 'bg-blue-100 text-blue-800',
  approved: 'bg-violet-100 text-violet-800',
  sent: 'bg-emerald-100 text-emerald-800',
};

function ordinal(n: number): string {
  return `${n}ª`;
}

const infractionSchema = z.object({
  description: z.string().min(10, 'Descreva a infração com pelo menos 10 caracteres'),
});

type InfractionForm = z.infer<typeof infractionSchema>;

export default function InfractionsPage() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const unitId = params.unitId as string;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const token = authStorage.get();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${baseUrl}/infractions/export?unitId=${unitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infractions-unit-${unitId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExporting(false);
    }
  }

  const { data: unit } = useQuery({
    queryKey: ['unit', condominiumId, unitId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Unit[]>>(`/condominiums/${condominiumId}/units`);
      return res.data.data.find((u) => u.id === Number(unitId));
    },
  });

  const { data: infractions, isLoading } = useQuery({
    queryKey: ['infractions', unitId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Infraction>>>(
        `/infractions?unitId=${unitId}&page=1&limit=50`,
      );
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InfractionForm>({
    resolver: zodResolver(infractionSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (form: InfractionForm) => {
      const res = await api.post<ApiEnvelope<Infraction>>('/infractions', {
        description: form.description,
        unitId: Number(unitId),
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Infração registrada');
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Erro ao registrar infração'),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

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
            <h1 className="text-2xl font-bold text-foreground">
              Infrações — Unidade {unit?.identifier ?? unitId}
            </h1>
            {unit && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Proprietário: {unit.ownerName}
              </p>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="gap-1.5 cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
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
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {infractions && infractions.data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhuma infração registrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova infração" para registrar a primeira ocorrência.
            </p>
          </div>
        )}

        {/* List */}
        {infractions && infractions.data.length > 0 && (
          <>
            <div className="space-y-2">
              {infractions.data.map((inf, idx) => {
                const reincidencia = infractions.total - idx;
                return (
                  <button
                    key={inf.id}
                    onClick={() => router.push(
                      `/condominiums/${condominiumId}/units/${unitId}/infractions/${inf.id}`,
                    )}
                    className="group w-full text-left rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-accent/40 hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground leading-snug line-clamp-2">
                          {inf.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inf.occurrenceDate
                            ? new Date(inf.occurrenceDate).toLocaleDateString('pt-BR')
                            : 'Sem data'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {reincidencia > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                            <AlertTriangle className="h-3 w-3" />
                            {ordinal(reincidencia)} ocorrência
                          </span>
                        )}
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[inf.status]}`}>
                          {STATUS_LABEL[inf.status]}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {infractions.total} infração(ões) · Exibindo {infractions.data.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
