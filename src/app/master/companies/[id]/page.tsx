'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Hash, Calendar, Users,
  Mail, RotateCcw, AlertCircle, Copy, Plus, Trash2, AlertTriangle, Pencil,
  ShieldCheck, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { Company, Employee, CreatedEmployeeResult, Condominium } from '@/lib/types';

type RoleTarget = { user: Employee; nextRole: 'GERENTE' | 'FUNCIONARIO' };
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';

export default function MasterCompanyDetailPage() {
  return (
    <RequireAuth role="master">
      <AppShell>
        <MasterCompanyDetailContent />
      </AppShell>
    </RequireAuth>
  );
}

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

function MasterCompanyDetailContent() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const queryClient = useQueryClient();
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [condoOpen, setCondoOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<RoleTarget | null>(null);
  const [successResult, setSuccessResult] = useState<
    (CreatedEmployeeResult & { nome: string; title: string }) | null
  >(null);

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

  const createMutation = useApiMutation({
    errorMessage: 'Erro ao criar usuário',
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
  });

  const updateMutation = useApiMutation({
    errorMessage: 'Erro ao atualizar empresa',
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
  });

  const deleteMutation = useApiMutation({
    errorMessage: 'Erro ao excluir empresa',
    mutationFn: async () => {
      await api.delete(`/companies/${companyId}`);
    },
    onSuccess: () => {
      toast.success('Empresa excluída');
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      router.push('/master/companies');
    },
  });

  const resetMutation = useApiMutation({
    errorMessage: 'Erro ao resetar senha',
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
  });

  const createCondoMutation = useApiMutation({
    errorMessage: 'Erro ao criar condomínio',
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
  });

  const changeRoleMutation = useApiMutation({
    mutationFn: async (vars: { userId: number; role: 'GERENTE' | 'FUNCIONARIO' }) => {
      const res = await api.patch<ApiEnvelope<Employee>>(
        `/companies/${companyId}/users/${vars.userId}/role`,
        { role: vars.role },
      );
      return res.data.data;
    },
    onError: (err) => {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        toast.error('Esta empresa já possui um gerente ativo — rebaixe-o primeiro.');
      } else {
        toast.error('Não foi possível alterar o papel. Tente novamente.');
      }
      return true;
    },
    onSuccess: (_, vars) => {
      const label = vars.role === 'GERENTE' ? 'promovido a Gerente' : 'rebaixado a Funcionário';
      toast.success(`Usuário ${label} com sucesso`);
      setRoleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['master-company-users', companyId] });
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
    <>
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => router.push('/master/companies')}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Empresas
          </button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">
            {company?.name ?? '…'}
          </span>
        </nav>

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

          {users && users.length > 0 && (() => {
            const hasActiveGerente = users.some((u) => u.role === 'GERENTE');
            return (
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
                          <td className="px-5 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {u.nome}
                              {u.role === 'GERENTE' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300">
                                  <ShieldCheck className="h-3 w-3" /> Gerente
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  <UserCheck className="h-3 w-3" /> Funcionário
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />{u.email}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.role === 'FUNCIONARIO' ? (
                                <span title={hasActiveGerente ? 'Rebaixe o gerente atual primeiro' : undefined}>
                                  <Button
                                    size="sm" variant="outline"
                                    disabled={hasActiveGerente}
                                    onClick={() => setRoleTarget({ user: u, nextRole: 'GERENTE' })}
                                    className="gap-1.5 cursor-pointer"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" /> Promover
                                  </Button>
                                </span>
                              ) : (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => setRoleTarget({ user: u, nextRole: 'FUNCIONARIO' })}
                                  className="gap-1.5 cursor-pointer text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                >
                                  <UserCheck className="h-3.5 w-3.5" /> Rebaixar
                                </Button>
                              )}
                              <Button
                                size="sm" variant="outline"
                                onClick={() => setResetTarget(u)}
                                className="gap-1.5 cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Resetar senha
                              </Button>
                            </div>
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
            );
          })()}
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
                    </tr>
                  </thead>
                  <tbody>
                    {condominiums.map((c) => (
                      <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{c.cnpj}</span>
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

      {/* Confirm role change */}
      <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roleTarget?.nextRole === 'GERENTE' ? 'Promover a Gerente' : 'Rebaixar a Funcionário'}
            </DialogTitle>
          </DialogHeader>
          {roleTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {roleTarget.nextRole === 'GERENTE'
                  ? 'O usuário passará a ter acesso de gerente nesta empresa.'
                  : 'O usuário perderá o acesso de gerente e voltará a ser funcionário.'}
              </p>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="font-medium text-foreground">{roleTarget.user.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{roleTarget.user.email}</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Esta ação altera o nível de acesso do usuário imediatamente.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRoleTarget(null)}
                  disabled={changeRoleMutation.isPending}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => changeRoleMutation.mutate({ userId: roleTarget.user.id, role: roleTarget.nextRole })}
                  disabled={changeRoleMutation.isPending}
                  className="cursor-pointer"
                >
                  {changeRoleMutation.isPending ? 'Salvando...' : 'Confirmar'}
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
    </>
  );
}
