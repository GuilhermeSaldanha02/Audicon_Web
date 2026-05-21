'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Hash, Calendar, Users,
  Mail, RotateCcw, AlertCircle, Copy, Plus, Trash2, AlertTriangle, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Company, Employee, CreatedEmployeeResult, Condominium } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const createSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  email: z.email('E-mail inválido'),
});
type CreateForm = z.infer<typeof createSchema>;

const editCompanySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(160),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
});
type EditCompanyForm = z.infer<typeof editCompanySchema>;

const condoSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  address: z.string().min(1, 'Endereço obrigatório'),
});
type CondoForm = z.infer<typeof condoSchema>;

export default function MasterCompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const queryClient = useQueryClient();
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [condoOpen, setCondoOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Condominium | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [successResult, setSuccessResult] = useState<
    (CreatedEmployeeResult & { nome: string; title: string }) | null
  >(null);

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) { router.replace('/login'); return; }
    if (!claims.isMaster) router.replace('/condominiums');
  }, [router]);

  const { data: company } = useQuery({
    queryKey: ['master-company', companyId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Company>>(`/companies/${companyId}`);
      return res.data.data;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['master-company-users', companyId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Employee[]>>(`/companies/${companyId}/users`);
      return res.data.data;
    },
  });

  const { register: registerCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: createErrors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const { register: registerEdit, handleSubmit: handleEdit, reset: resetEdit, formState: { errors: editErrors } } = useForm<EditCompanyForm>({
    resolver: zodResolver(editCompanySchema),
  });

  const { register: registerCondo, handleSubmit: handleCondo, reset: resetCondo, formState: { errors: condoErrors } } = useForm<CondoForm>({
    resolver: zodResolver(condoSchema),
  });

  const { data: condominiums } = useQuery({
    queryKey: ['master-company-condominiums', companyId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Condominium[]>>(`/companies/${companyId}/condominiums`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateForm) => {
      const res = await api.post<ApiEnvelope<CreatedEmployeeResult>>(
        `/companies/${companyId}/users`, form,
      );
      return res.data.data;
    },
    onSuccess: (result) => {
      toast.success('Usuário criado');
      setCreateOpen(false);
      resetCreate();
      setSuccessResult({ ...result, nome: result.nome, title: 'Usuário criado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['master-company-users', companyId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao criar usuário';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao criar usuário');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (form: EditCompanyForm) => {
      const res = await api.patch<ApiEnvelope<Company>>(`/companies/${companyId}`, form);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Empresa atualizada');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['master-company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao atualizar empresa';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao atualizar empresa');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/companies/${companyId}`);
    },
    onSuccess: () => {
      toast.success('Empresa excluída');
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      router.push('/master/companies');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao excluir empresa';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao excluir empresa');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.post<ApiEnvelope<CreatedEmployeeResult>>(
        `/companies/${companyId}/users/${userId}/reset-password`,
      );
      return res.data.data;
    },
    onSuccess: (result, userId) => {
      const target = resetTarget;
      setResetTarget(null);
      setSuccessResult({
        ...result,
        nome: target?.nome ?? `Usuário #${userId}`,
        title: `Senha de ${target?.nome ?? 'usuário'} resetada`,
      });
      toast.success('Senha resetada');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao resetar senha';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao resetar senha');
    },
  });

  const createCondoMutation = useMutation({
    mutationFn: async (form: CondoForm) => {
      const res = await api.post<ApiEnvelope<Condominium>>('/condominiums', {
        ...form,
        companyId: Number(companyId),
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Condomínio criado');
      setCondoOpen(false);
      resetCondo();
      queryClient.invalidateQueries({ queryKey: ['master-company-condominiums', companyId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao criar condomínio';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao criar condomínio');
    },
  });

  const assignAdminMutation = useMutation({
    mutationFn: async (vars: { condominiumId: number; email: string }) => {
      await api.post(`/condominiums/${vars.condominiumId}/members`, {
        email: vars.email,
        role: 'ADMIN',
      });
    },
    onSuccess: () => {
      toast.success('Administrador atribuído');
      setAssignTarget(null);
      setAssignEmail('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao atribuir administrador';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao atribuir administrador');
    },
  });

  function openEdit() {
    if (company) {
      resetEdit({ name: company.name, cnpj: company.cnpj });
    }
    setEditOpen(true);
  }

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.tempPassword);
    toast.success('Senha copiada');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="outline" size="sm"
            onClick={() => router.push('/master/companies')}
            className="gap-1.5 cursor-pointer mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground truncate">
                {company?.name ?? 'Carregando...'}
              </h1>
            </div>
            {company && (
              <div className="flex items-center gap-4 pl-0.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />{company.cnpj}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
          {company && (
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <Button
                variant="outline" size="sm"
                onClick={openEdit}
                className="gap-1.5 cursor-pointer"
              >
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

        {/* Users */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Usuários da empresa</h2>
              {users && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {users.length}
                </span>
              )}
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={
                <Button size="sm" className="gap-1.5 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Novo usuário
                </Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Criar usuário para {company?.name}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate((d) => createMutation.mutate(d))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input placeholder="Maria Souza" {...registerCreate('nome')} />
                    {createErrors.nome && <p className="text-xs text-destructive">{createErrors.nome.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="maria@empresa.com" {...registerCreate('email')} />
                    {createErrors.email && <p className="text-xs text-destructive">{createErrors.email.message}</p>}
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Criando...' : 'Criar usuário'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          )}

          {!isLoading && (!users || users.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground text-sm">Nenhum usuário cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Crie o primeiro usuário para esta empresa.</p>
            </div>
          )}

          {users && users.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left">Nome</th>
                      <th className="px-5 py-3 text-left">E-mail</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{u.nome}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />{u.email}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => setResetTarget(u)}
                            className="gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Resetar senha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
                {users.length} usuário(s)
              </div>
            </div>
          )}
        </div>

        {/* Condomínios */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Condomínios</h2>
              {condominiums && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {condominiums.length}
                </span>
              )}
            </div>
            <Dialog open={condoOpen} onOpenChange={setCondoOpen}>
              <DialogTrigger render={
                <Button size="sm" className="gap-1.5 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Novo condomínio
                </Button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Criar condomínio para {company?.name}</DialogTitle></DialogHeader>
                <form onSubmit={handleCondo((d) => createCondoMutation.mutate(d))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input placeholder="Condomínio Jardim das Flores" {...registerCondo('name')} />
                    {condoErrors.name && <p className="text-xs text-destructive">{condoErrors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <Input placeholder="12.345.678/0001-95" {...registerCondo('cnpj')} />
                    {condoErrors.cnpj && <p className="text-xs text-destructive">{condoErrors.cnpj.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Endereço</Label>
                    <Input placeholder="Rua das Acácias, 100 — São Paulo, SP" {...registerCondo('address')} />
                    {condoErrors.address && <p className="text-xs text-destructive">{condoErrors.address.message}</p>}
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={createCondoMutation.isPending}>
                    {createCondoMutation.isPending ? 'Criando...' : 'Criar condomínio'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {(!condominiums || condominiums.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground text-sm">Nenhum condomínio cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Crie um condomínio e atribua um administrador da empresa.</p>
            </div>
          )}

          {condominiums && condominiums.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left">Nome</th>
                      <th className="px-5 py-3 text-left">CNPJ</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condominiums.map((c) => (
                      <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{c.cnpj}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setAssignTarget(c); setAssignEmail(''); }}
                            className="gap-1.5 cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" /> Atribuir admin
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
                {condominiums.length} condomínio(s)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit company dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar empresa</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit((d) => updateMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da empresa</Label>
              <Input placeholder="Administradora Exemplo Ltda" {...registerEdit('name')} />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input placeholder="12.345.678/0001-90" {...registerEdit('cnpj')} />
              {editErrors.cnpj && <p className="text-xs text-destructive">{editErrors.cnpj.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign admin to condominium */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir administrador</DialogTitle></DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione um usuário da empresa para administrar{' '}
                <strong className="text-foreground">{assignTarget.name}</strong>.
              </p>
              {(!users || users.length === 0) ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Nenhum usuário cadastrado. Crie um usuário para a empresa antes de atribuir.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Usuário</Label>
                  <select
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer"
                  >
                    <option value="">Selecione um usuário...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>{u.nome} — {u.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assignAdminMutation.isPending} className="cursor-pointer">
                  Cancelar
                </Button>
                <Button
                  onClick={() => assignAdminMutation.mutate({ condominiumId: assignTarget.id, email: assignEmail })}
                  disabled={assignAdminMutation.isPending || !assignEmail}
                  className="cursor-pointer"
                >
                  {assignAdminMutation.isPending ? 'Atribuindo...' : 'Atribuir'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm reset */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar senha</DialogTitle></DialogHeader>
          {resetTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Uma nova senha temporária será gerada para:</p>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="font-medium text-foreground">{resetTarget.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{resetTarget.email}</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">A senha atual será invalidada imediatamente.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetMutation.isPending} className="cursor-pointer">
                  Cancelar
                </Button>
                <Button onClick={() => resetMutation.mutate(resetTarget.id)} disabled={resetMutation.isPending} className="cursor-pointer">
                  {resetMutation.isPending ? 'Resetando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={!!successResult} onOpenChange={(o) => !o && setSuccessResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{successResult?.title ?? 'Sucesso'}</DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">
                <strong>{successResult.nome}</strong>
                {successResult.title?.includes('criado') ? ' criado(a) com sucesso.' : ' — senha atualizada.'}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciais</p>
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm"><span className="text-muted-foreground">E-mail:</span>{' '}
                    <span className="font-mono">{successResult.email}</span></p>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Senha temporária:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base border border-border">
                        {successResult.tempPassword}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyPassword} className="gap-1.5 cursor-pointer">
                        <Copy className="h-3.5 w-3.5" /> Copiar
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

      {/* Delete company confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Esta ação é irreversível</p>
                <p className="text-sm text-muted-foreground">
                  A empresa <strong>{company?.name}</strong> e todos os seus usuários serão removidos.
                  Empresas com condomínios ativos não podem ser excluídas — remova os condomínios primeiro.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteMutation.isPending}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="cursor-pointer"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
