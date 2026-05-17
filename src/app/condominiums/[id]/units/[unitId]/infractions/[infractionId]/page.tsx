'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Infraction, InfractionStatus } from '@/lib/types';

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

export default function InfractionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const unitId = params.unitId as string;
  const infractionId = params.infractionId as string;
  const queryClient = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const { data: infraction, isLoading } = useQuery({
    queryKey: ['infraction', infractionId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Infraction>>(`/infractions/${infractionId}`);
      return res.data.data;
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<Infraction>>(
        `/infractions/${infractionId}/analyze`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Análise concluída');
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
    onError: () => toast.error('Erro ao analisar infração'),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiEnvelope<Infraction>>(
        `/infractions/${infractionId}/approve`,
        {},
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Infração aprovada');
      setApproveOpen(false);
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
    onError: () => toast.error('Erro ao aprovar infração'),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<Infraction>>(
        `/infractions/${infractionId}/send`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('E-mail enviado ao morador');
      setSendOpen(false);
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
    onError: () => toast.error('Erro ao enviar e-mail'),
  });

  async function downloadPdf() {
    try {
      const token = authStorage.get();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/infractions/${infractionId}/document`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infracao-${infractionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar PDF');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (!infraction) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">Infração não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/condominiums/${condominiumId}/units/${unitId}/infractions`,
              )
            }
          >
            ← Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Infração #{infraction.id}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor[infraction.status]}`}
            >
              {statusLabel[infraction.status]}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Descrição da ocorrência</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{infraction.description}</p>
            {infraction.occurrenceDate && (
              <p className="mt-2 text-sm text-slate-500">
                Data:{' '}
                {new Date(infraction.occurrenceDate).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        {(infraction.status === 'analyzed' ||
          infraction.status === 'approved' ||
          infraction.status === 'sent') &&
          infraction.formalDescription && (
            <Card>
              <CardHeader>
                <CardTitle>Análise da IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    Descrição formal
                  </p>
                  <p className="whitespace-pre-wrap text-slate-700">
                    {infraction.formalDescription}
                  </p>
                </div>
                {infraction.suggestedPenalty && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Penalidade sugerida
                    </p>
                    <p className="text-slate-700">
                      {infraction.suggestedPenalty}
                    </p>
                  </div>
                )}
                {infraction.approvedAt && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Aprovada em
                    </p>
                    <p className="text-slate-700">
                      {new Date(infraction.approvedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
                {infraction.sentAt && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Enviada em
                    </p>
                    <p className="text-slate-700">
                      {new Date(infraction.sentAt).toLocaleString('pt-BR')}
                      {infraction.unit?.residentEmail && (
                        <span className="text-slate-500">
                          {' '}
                          → {infraction.unit.residentEmail}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        <div className="flex flex-wrap gap-3">
          {infraction.status === 'pending' && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending
                ? 'Analisando...'
                : '🤖 Analisar via IA'}
            </Button>
          )}

          {infraction.status === 'analyzed' && (
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
              <DialogTrigger render={<Button />}>✅ Aprovar</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar aprovação</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                  Ao aprovar, a infração ficará pronta para envio ao morador.
                  Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setApproveOpen(false)}
                    disabled={approveMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending
                      ? 'Aprovando...'
                      : 'Confirmar aprovação'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {infraction.status === 'approved' &&
            (infraction.unit?.residentEmail ? (
              <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogTrigger render={<Button />}>
                  📧 Enviar por e-mail
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar envio</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-600">
                    O documento será enviado por e-mail para:
                  </p>
                  <p className="rounded bg-slate-100 px-3 py-2 font-mono text-sm">
                    {infraction.unit.residentEmail}
                  </p>
                  <p className="text-xs text-slate-500">
                    Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSendOpen(false)}
                      disabled={sendMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => sendMutation.mutate()}
                      disabled={sendMutation.isPending}
                    >
                      {sendMutation.isPending
                        ? 'Enviando...'
                        : 'Confirmar envio'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled>
                  📧 Enviar por e-mail
                </Button>
                <span className="text-xs text-amber-700">
                  Cadastre o e-mail do morador na unidade para habilitar o
                  envio.
                </span>
              </div>
            ))}

          {(infraction.status === 'analyzed' ||
            infraction.status === 'approved' ||
            infraction.status === 'sent') && (
            <Button onClick={downloadPdf} variant="outline">
              📄 Baixar PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
