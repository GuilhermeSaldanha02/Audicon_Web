'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Infraction, Unit, InfractionStatus } from '@/lib/types';

const statusLabel: Record<InfractionStatus, string> = {
  pending: 'Pendente',
  analyzed: 'Analisado',
  approved: 'Aprovado',
  sent: 'Enviado',
};

const statusColor: Record<InfractionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  analyzed: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  sent: 'bg-green-100 text-green-800',
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
      const res = await fetch(
        `${baseUrl}/infractions/export?unitId=${unitId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
      const res = await api.get<ApiEnvelope<Unit[]>>(
        `/condominiums/${condominiumId}/units`,
      );
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InfractionForm>({ resolver: zodResolver(infractionSchema) });

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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/condominiums/${condominiumId}`)}
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Infrações — Unidade {unit?.identifier ?? unitId}
            </h1>
            {unit && (
              <p className="text-sm text-slate-500">Proprietário: {unit.ownerName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ocorrências</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={exporting}
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button />}>+ Nova infração</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar infração</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Descrição da ocorrência</Label>
                  <Textarea
                    placeholder="Descreva o que aconteceu..."
                    rows={4}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registrando...' : 'Registrar'}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}

        {infractions && (
          <>
            {infractions.data.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Nenhuma infração registrada para esta unidade.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {infractions.data.map((inf) => {
                  const reincidencia =
                    infractions.total -
                    infractions.data.findIndex((i) => i.id === inf.id);
                  return (
                    <Card
                      key={inf.id}
                      className="cursor-pointer hover:shadow-md transition"
                      onClick={() =>
                        router.push(
                          `/condominiums/${condominiumId}/units/${unitId}/infractions/${inf.id}`,
                        )
                      }
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">
                            {inf.description}
                          </CardTitle>
                          <div className="flex items-center gap-2 shrink-0">
                            {reincidencia > 1 && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                                {ordinal(reincidencia)} ocorrência
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inf.status]}`}
                            >
                              {statusLabel[inf.status]}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-slate-500">
                        {inf.occurrenceDate
                          ? new Date(inf.occurrenceDate).toLocaleDateString(
                              'pt-BR',
                            )
                          : '—'}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-slate-500">Total: {infractions.total} infração(ões)</p>
          </>
        )}
      </div>
    </div>
  );
}
