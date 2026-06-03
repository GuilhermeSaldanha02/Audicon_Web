'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Bot, CheckCircle, Mail, MessageCircle,
  FileDown, AlertCircle, Clock, Send, ChevronRight,
  Trash2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Infraction, InfractionStatus, Condominium } from '@/lib/types';
import { InfractionImages } from '@/components/infraction-images';
import { NotificationHistory } from '@/components/notification-history';
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

const editSchema = z.object({
  description: z.string().min(5, 'Mínimo 5 caracteres'),
});
type EditForm = z.infer<typeof editSchema>;

export default function CondominiumInfractionDetailPage() {
  return (
    <RequireAuth>
      <AppShell>
        <InfractionDetailContent />
      </AppShell>
    </RequireAuth>
  );
}

function InfractionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const infractionId = params.infractionId as string;
  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const canEdit = claims?.role === 'GERENTE' || claims?.role === 'FUNCIONARIO';

  const [approveOpen, setApproveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: condominium } = useQuery({
    queryKey: ['condominium', condominiumId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Condominium>>(`/condominiums/${condominiumId}`);
      return res.data.data;
    },
  });

  const { data: infraction, isLoading } = useQuery({
    queryKey: ['infraction', infractionId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Infraction>>(`/infractions/${infractionId}`);
      return res.data.data;
    },
  });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  function openEdit() {
    if (infraction) resetEdit({ description: infraction.description });
    setEditOpen(true);
  }

  const editMutation = useApiMutation({
    errorMessage: 'Erro ao atualizar infração',
    mutationFn: async (form: EditForm) => {
      const res = await api.patch<ApiEnvelope<Infraction>>(`/infractions/${infractionId}`, form);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Infração atualizada');
      queryClient.invalidateQueries({ queryKey: ['infraction', infractionId] });
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
      setEditOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
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
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
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
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
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
      queryClient.invalidateQueries({ queryKey: ['infractions-condo', condominiumId] });
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: 'Erro ao excluir infração',
    mutationFn: async () => {
      await api.delete(`/infractions/${infractionId}`);
    },
    onSuccess: () => {
      toast.success('Infração excluída');
      router.push(`/condominiums/${condominiumId}/infractions`);
    },
  });

  async function downloadPdf() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/infractions/${infractionId}/document`,
        { credentials: 'include' },
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
      <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-4">
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!infraction) {
    return (
      <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 flex items-center justify-center">
        <p className="text-destructive">Infração não encontrada</p>
      </div>
    );
  }

  const hasAnalysis = ['analyzed', 'approved', 'sent'].includes(infraction.status);

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-6">
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
        <button
          onClick={() => router.push(`/condominiums/${condominiumId}/infractions`)}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          Infrações
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">#{infraction.id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline" size="sm"
          onClick={() => router.push(`/condominiums/${condominiumId}/infractions`)}
          className="gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Infração #{infraction.id}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${STATUS_BADGE_CLASS[infraction.status]}`}>
            {STATUS_LABEL[infraction.status]}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 cursor-pointer">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setDeleteOpen(true)}
              className="gap-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        {/* Main column */}
        <div className="space-y-6">
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

          {/* Notification history */}
          <NotificationHistory infractionId={Number(infractionId)} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {/* Dados rápidos */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Dados rápidos</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[infraction.status]}`}>
                    {STATUS_LABEL[infraction.status]}
                  </span>
                </dd>
              </div>
              {infraction.unit && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Unidade</dt>
                  <dd className="font-medium text-foreground">{infraction.unit.identifier}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Data</dt>
                <dd className="text-foreground">
                  {infraction.occurrenceDate
                    ? new Date(infraction.occurrenceDate).toLocaleDateString('pt-BR')
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Ações</h3>
            <div className="space-y-2">
              {infraction.status === 'pending' && (
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full gap-2 cursor-pointer"
                >
                  <Bot className="h-4 w-4" />
                  {analyzeMutation.isPending ? 'Analisando...' : 'Analisar via IA'}
                </Button>
              )}

              {infraction.status === 'analyzed' && (
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                  <DialogTrigger render={
                    <Button className="w-full gap-2 cursor-pointer">
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
                      <Button className="w-full gap-2 cursor-pointer">
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
                  <div className="space-y-1">
                    <Button variant="outline" disabled className="w-full gap-2">
                      <Mail className="h-4 w-4" /> Enviar por e-mail
                    </Button>
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="h-3 w-3" />
                      Cadastre o e-mail do morador na unidade.
                    </p>
                  </div>
                )
              )}

              {(infraction.status === 'approved' || infraction.status === 'sent') && (
                infraction.unit?.residentPhone ? (
                  <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
                    <DialogTrigger render={
                      <Button variant="outline" className="w-full gap-2 cursor-pointer">
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
                  <div className="space-y-1">
                    <Button variant="outline" disabled className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
                    </Button>
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="h-3 w-3" />
                      Cadastre o telefone do morador na unidade.
                    </p>
                  </div>
                )
              )}

              {hasAnalysis && (
                <Button onClick={downloadPdf} variant="outline" className="w-full gap-2 cursor-pointer">
                  <FileDown className="h-4 w-4" /> Baixar PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar infração</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit((d) => editMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={4} {...registerEdit('description')} />
              {editErrors.description && (
                <p className="text-xs text-destructive">{editErrors.description.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir infração</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Esta ação removerá permanentemente a infração #{infractionId}. Esta operação é irreversível.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending} className="cursor-pointer">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="cursor-pointer">
                {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
