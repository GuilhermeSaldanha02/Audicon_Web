'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Bot, CheckCircle, Mail, MessageCircle,
  FileDown, AlertCircle, Clock, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Infraction, InfractionStatus } from '@/lib/types';
import { InfractionImages } from '@/components/infraction-images';
import { NotificationHistory } from '@/components/notification-history';
import { BrandHeader } from '@/components/brand-header';
import { RequireAuth } from '@/components/require-auth';

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

export default function InfractionDetailPage() {
  return (
    <RequireAuth>
      <InfractionDetailContent />
    </RequireAuth>
  );
}

function InfractionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const unitId = params.unitId as string;
  const infractionId = params.infractionId as string;
  const queryClient = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const { data: infraction, isLoading } = useQuery({
    queryKey: ['infraction', infractionId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Infraction>>(`/infractions/${infractionId}`);
      return res.data.data;
    },
  });

  const analyzeMutation = useApiMutation({
    errorMessage: 'Erro ao analisar infração',
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<Infraction>>(`/infractions/${infractionId}/analyze`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Análise concluída');
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
  });

  const approveMutation = useApiMutation({
    errorMessage: 'Erro ao aprovar infração',
    mutationFn: async () => {
      const res = await api.patch<ApiEnvelope<Infraction>>(
        `/infractions/${infractionId}/approve`, {},
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Infração aprovada');
      setApproveOpen(false);
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
  });

  const sendMutation = useApiMutation({
    errorMessage: 'Erro ao enviar e-mail',
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<Infraction>>(`/infractions/${infractionId}/send`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('E-mail enviado ao morador');
      setSendOpen(false);
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
  });

  const whatsappMutation = useApiMutation({
    errorMessage: 'Erro ao enviar WhatsApp',
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<Infraction>>(
        `/infractions/${infractionId}/send-whatsapp`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Alerta enviado por WhatsApp');
      setWhatsappOpen(false);
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions', unitId] });
    },
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
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-4">
          <BrandHeader />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!infraction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Infração não encontrada</p>
      </div>
    );
  }

  const hasAnalysis = ['analyzed', 'approved', 'sent'].includes(infraction.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <BrandHeader />

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline" size="sm"
            onClick={() => router.push(`/condominiums/${condominiumId}/units/${unitId}/infractions`)}
            className="gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Infração #{infraction.id}</h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[infraction.status]}`}>
              {STATUS_LABEL[infraction.status]}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Descrição da ocorrência</h2>
          <p className="text-foreground leading-relaxed">{infraction.description}</p>
          {infraction.occurrenceDate && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(infraction.occurrenceDate).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>

        {/* Images */}
        <InfractionImages infractionId={infractionId} />

        {/* AI Analysis */}
        {hasAnalysis && infraction.formalDescription && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent" />
              <h2 className="font-semibold text-foreground">Análise da IA</h2>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Descrição formal
              </p>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {infraction.formalDescription}
              </p>
            </div>

            {infraction.suggestedPenalty && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Penalidade sugerida
                </p>
                <p className="text-foreground">{infraction.suggestedPenalty}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              {infraction.approvedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-violet-500" />
                  Aprovada em {new Date(infraction.approvedAt).toLocaleString('pt-BR')}
                </div>
              )}
              {infraction.sentAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                  E-mail enviado em {new Date(infraction.sentAt).toLocaleString('pt-BR')}
                  {infraction.unit?.residentEmail && (
                    <span className="text-muted-foreground/70">→ {infraction.unit.residentEmail}</span>
                  )}
                </div>
              )}
              {infraction.whatsappSentAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-teal-500" />
                  WhatsApp enviado em {new Date(infraction.whatsappSentAt).toLocaleString('pt-BR')}
                  {infraction.unit?.residentPhone && (
                    <span className="text-muted-foreground/70">→ {infraction.unit.residentPhone}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {infraction.status === 'pending' && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="gap-2 cursor-pointer"
            >
              <Bot className="h-4 w-4" />
              {analyzeMutation.isPending ? 'Analisando...' : 'Analisar via IA'}
            </Button>
          )}

          {infraction.status === 'analyzed' && (
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
              <DialogTrigger render={
                <Button className="gap-2 cursor-pointer">
                  <CheckCircle className="h-4 w-4" /> Aprovar
                </Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Confirmar aprovação</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Ao aprovar, a infração ficará pronta para envio ao morador. Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approveMutation.isPending} className="cursor-pointer">
                    Cancelar
                  </Button>
                  <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} className="cursor-pointer">
                    {approveMutation.isPending ? 'Aprovando...' : 'Confirmar aprovação'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {infraction.status === 'approved' && (
            infraction.unit?.residentEmail ? (
              <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogTrigger render={
                  <Button className="gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" /> Enviar por e-mail
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader><DialogTitle>Confirmar envio</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">O documento será enviado por e-mail para:</p>
                  <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm">
                    {infraction.unit.residentEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sendMutation.isPending} className="cursor-pointer">
                      Cancelar
                    </Button>
                    <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="cursor-pointer">
                      {sendMutation.isPending ? 'Enviando...' : 'Confirmar envio'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled className="gap-2">
                  <Mail className="h-4 w-4" /> Enviar por e-mail
                </Button>
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Cadastre o e-mail do morador na unidade.
                </div>
              </div>
            )
          )}

          {(infraction.status === 'approved' || infraction.status === 'sent') && (
            infraction.unit?.residentPhone ? (
              <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
                <DialogTrigger render={
                  <Button variant="outline" className="gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader><DialogTitle>Enviar alerta por WhatsApp</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Um alerta será enviado para:</p>
                  <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm">
                    {infraction.unit.residentPhone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O documento completo já foi (ou será) enviado por e-mail. O WhatsApp é apenas um aviso curto.
                  </p>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={() => setWhatsappOpen(false)} disabled={whatsappMutation.isPending} className="cursor-pointer">
                      Cancelar
                    </Button>
                    <Button onClick={() => whatsappMutation.mutate()} disabled={whatsappMutation.isPending} className="cursor-pointer">
                      {whatsappMutation.isPending ? 'Enviando...' : 'Confirmar envio'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled className="gap-2">
                  <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
                </Button>
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Cadastre o telefone do morador na unidade.
                </div>
              </div>
            )
          )}

          {hasAnalysis && (
            <Button onClick={downloadPdf} variant="outline" className="gap-2 cursor-pointer">
              <FileDown className="h-4 w-4" /> Baixar PDF
            </Button>
          )}
        </div>

        {/* Notification history */}
        <NotificationHistory infractionId={Number(infractionId)} />
      </div>
    </div>
  );
}
