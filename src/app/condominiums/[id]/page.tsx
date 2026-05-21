'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Hash, MapPin, Plus, ChevronRight,
  FileText, Upload, Trash2, Download, Mail, Phone, Home, AlertTriangle, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Condominium, Unit } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const unitSchema = z.object({
  identifier: z.string().min(1, 'Identificador obrigatório'),
  ownerName: z.string().min(1, 'Nome do proprietário obrigatório'),
  residentEmail: z.string().trim().optional().refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: 'E-mail inválido' },
  ),
  residentPhone: z.string().trim().optional(),
});
type UnitForm = z.infer<typeof unitSchema>;

const condoSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  address: z.string().min(1, 'Endereço obrigatório'),
});
type CondoForm = z.infer<typeof condoSchema>;

export default function CondominiumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteCondoOpen, setDeleteCondoOpen] = useState(false);
  const [editCondoOpen, setEditCondoOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMaster = !!authStorage.getClaims()?.isMaster;

  const { data: condominium, isLoading: loadingCondominium } = useQuery({
    queryKey: ['condominium', condominiumId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Condominium>>(`/condominiums/${condominiumId}`);
      return res.data.data;
    },
  });

  const { data: units, isLoading: loadingUnits } = useQuery({
    queryKey: ['units', condominiumId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Unit[]>>(`/condominiums/${condominiumId}/units`);
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
  });

  const {
    register: registerCondo, handleSubmit: handleCondoSubmit, reset: resetCondo,
    formState: { errors: condoErrors },
  } = useForm<CondoForm>({ resolver: zodResolver(condoSchema) });

  const {
    register: registerEditUnit, handleSubmit: handleEditUnit, reset: resetEditUnit,
    formState: { errors: editUnitErrors },
  } = useForm<UnitForm>({ resolver: zodResolver(unitSchema) });

  const createUnit = useMutation({
    mutationFn: async (form: UnitForm) => {
      const payload = {
        identifier: form.identifier,
        ownerName: form.ownerName,
        ...(form.residentEmail ? { residentEmail: form.residentEmail } : {}),
        ...(form.residentPhone ? { residentPhone: form.residentPhone } : {}),
      };
      const res = await api.post<ApiEnvelope<Unit>>(`/condominiums/${condominiumId}/units`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Unidade criada');
      queryClient.invalidateQueries({ queryKey: ['units', condominiumId] });
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Erro ao criar unidade'),
  });

  const updateCondo = useMutation({
    mutationFn: async (form: CondoForm) => {
      const res = await api.patch<ApiEnvelope<Condominium>>(`/condominiums/${condominiumId}`, form);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Condomínio atualizado');
      queryClient.invalidateQueries({ queryKey: ['condominium', condominiumId] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setEditCondoOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao atualizar condomínio';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao atualizar condomínio');
    },
  });

  const updateUnit = useMutation({
    mutationFn: async (form: UnitForm & { id: number }) => {
      const { id, ...payload } = form;
      const res = await api.patch<ApiEnvelope<Unit>>(
        `/condominiums/${condominiumId}/units/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Unidade atualizada');
      queryClient.invalidateQueries({ queryKey: ['units', condominiumId] });
      setEditUnit(null);
    },
    onError: () => toast.error('Erro ao atualizar unidade'),
  });

  const uploadRegimento = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/condominiums/${condominiumId}/regimento`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Regimento enviado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['condominium', condominiumId] });
    },
    onError: () => toast.error('Erro ao enviar regimento'),
  });

  const deleteRegimento = useMutation({
    mutationFn: async () => {
      await api.delete(`/condominiums/${condominiumId}/regimento`);
    },
    onSuccess: () => {
      toast.success('Regimento removido');
      queryClient.invalidateQueries({ queryKey: ['condominium', condominiumId] });
    },
    onError: () => toast.error('Erro ao remover regimento'),
  });

  const deleteCondominium = useMutation({
    mutationFn: async () => {
      await api.delete(`/condominiums/${condominiumId}`);
    },
    onSuccess: () => {
      toast.success('Condomínio removido');
      router.push('/condominiums');
    },
    onError: () => toast.error('Erro ao remover condomínio'),
  });

  async function downloadRegimento() {
    const res = await api.get(`/condominiums/${condominiumId}/regimento`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = condominium?.regimentoFilename ?? 'regimento.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos');
      return;
    }
    uploadRegimento.mutate(file);
    e.target.value = '';
  }

  function openEditCondo() {
    if (condominium) {
      resetCondo({ name: condominium.name, cnpj: condominium.cnpj, address: condominium.address });
    }
    setEditCondoOpen(true);
  }

  function openEditUnit(u: Unit) {
    resetEditUnit({
      identifier: u.identifier,
      ownerName: u.ownerName,
      residentEmail: u.residentEmail ?? '',
      residentPhone: u.residentPhone ?? '',
    });
    setEditUnit(u);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="outline" size="sm"
            onClick={() => router.push('/condominiums')}
            className="gap-1.5 cursor-pointer mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="flex-1 min-w-0">
            {loadingCondominium ? (
              <div className="h-8 w-64 rounded bg-muted animate-pulse" />
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground truncate">{condominium?.name}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-4 pl-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />{condominium?.cnpj}
                  </span>
                  {condominium?.address && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />{condominium.address}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          {condominium && (
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <Button
                variant="outline" size="sm"
                onClick={openEditCondo}
                className="gap-1.5 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              {isMaster && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => setDeleteCondoOpen(true)}
                  className="gap-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Regimento */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Regimento Interno</h2>
          </div>
          {condominium?.regimentoFilename ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <FileText className="h-4 w-4 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {condominium.regimentoFilename}
                </p>
                {condominium.regimentoUploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    Enviado em {new Date(condominium.regimentoUploadedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={downloadRegimento} className="gap-1.5 cursor-pointer shrink-0">
                <Download className="h-3.5 w-3.5" /> Baixar
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={deleteRegimento.isPending}
                onClick={() => deleteRegimento.mutate()}
                className="gap-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Nenhum regimento cadastrado. A IA usará análise genérica.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline" size="sm"
                disabled={uploadRegimento.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadRegimento.isPending ? 'Enviando...' : 'Enviar PDF'}
              </Button>
            </div>
          )}
        </div>

        {/* Units */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Unidades</h2>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={
                <Button className="gap-2 cursor-pointer" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Nova unidade
                </Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Criar unidade</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit((d) => createUnit.mutate(d))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Identificador</Label>
                    <Input placeholder="A-101" {...register('identifier')} />
                    {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome do proprietário</Label>
                    <Input placeholder="João da Silva" {...register('ownerName')} />
                    {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail do morador <span className="text-muted-foreground">(opcional)</span></Label>
                    <Input type="email" placeholder="morador@exemplo.com" {...register('residentEmail')} />
                    {errors.residentEmail && <p className="text-xs text-destructive">{errors.residentEmail.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp do morador <span className="text-muted-foreground">(opcional)</span></Label>
                    <Input placeholder="+5511999998888" {...register('residentPhone')} />
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={createUnit.isPending}>
                    {createUnit.isPending ? 'Criando...' : 'Criar unidade'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loadingUnits && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          )}

          {units && units.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                <Home className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground text-sm">Nenhuma unidade cadastrada</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione unidades para registrar infrações.</p>
            </div>
          )}

          {units && units.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="group relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-accent/40 hover:shadow-md"
                  >
                    {/* Edit button overlay */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditUnit(u); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted cursor-pointer"
                      title="Editar unidade"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => router.push(`/condominiums/${condominiumId}/units/${u.id}/infractions`)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Home className="h-4 w-4 text-primary" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 mt-1" />
                      </div>
                      <p className="font-semibold text-foreground mb-0.5">{u.identifier}</p>
                      <p className="text-sm text-muted-foreground mb-2">{u.ownerName}</p>
                      <div className="space-y-1">
                        {u.residentEmail && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{u.residentEmail}</span>
                          </div>
                        )}
                        {u.residentPhone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />{u.residentPhone}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{units.length} unidade(s)</p>
            </>
          )}
        </div>
      </div>

      {/* Edit condominium dialog */}
      <Dialog open={editCondoOpen} onOpenChange={setEditCondoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar condomínio</DialogTitle></DialogHeader>
          <form onSubmit={handleCondoSubmit((d) => updateCondo.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Condomínio Jardim das Flores" {...registerCondo('name')} />
              {condoErrors.name && <p className="text-xs text-destructive">{condoErrors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input placeholder="12.345.678/0001-90" {...registerCondo('cnpj')} />
              {condoErrors.cnpj && <p className="text-xs text-destructive">{condoErrors.cnpj.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input placeholder="Rua das Acácias, 100 - São Paulo, SP" {...registerCondo('address')} />
              {condoErrors.address && <p className="text-xs text-destructive">{condoErrors.address.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditCondoOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={updateCondo.isPending}>
                {updateCondo.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit unit dialog */}
      <Dialog open={!!editUnit} onOpenChange={(o) => !o && setEditUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar unidade {editUnit?.identifier}</DialogTitle>
          </DialogHeader>
          {editUnit && (
            <form
              onSubmit={handleEditUnit((d) => updateUnit.mutate({ ...d, id: editUnit.id }))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Identificador</Label>
                <Input placeholder="A-101" {...registerEditUnit('identifier')} />
                {editUnitErrors.identifier && <p className="text-xs text-destructive">{editUnitErrors.identifier.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nome do proprietário</Label>
                <Input placeholder="João da Silva" {...registerEditUnit('ownerName')} />
                {editUnitErrors.ownerName && <p className="text-xs text-destructive">{editUnitErrors.ownerName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do morador <span className="text-muted-foreground">(opcional)</span></Label>
                <Input type="email" placeholder="morador@exemplo.com" {...registerEditUnit('residentEmail')} />
                {editUnitErrors.residentEmail && <p className="text-xs text-destructive">{editUnitErrors.residentEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp do morador <span className="text-muted-foreground">(opcional)</span></Label>
                <Input placeholder="+5511999998888" {...registerEditUnit('residentPhone')} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditUnit(null)} className="cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={updateUnit.isPending}>
                  {updateUnit.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete condominium confirmation */}
      <Dialog open={deleteCondoOpen} onOpenChange={setDeleteCondoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir condomínio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Esta ação é irreversível</p>
                <p className="text-sm text-muted-foreground">
                  O condomínio <strong>{condominium?.name}</strong> e todas as suas unidades serão removidos.
                  As infrações associadas também serão afetadas.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteCondoOpen(false)}
                disabled={deleteCondominium.isPending}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteCondominium.mutate()}
                disabled={deleteCondominium.isPending}
                className="cursor-pointer"
              >
                {deleteCondominium.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
