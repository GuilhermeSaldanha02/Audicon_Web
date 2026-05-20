'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Users, Plus, Mail, RotateCcw, Copy, AlertCircle, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Employee, CreateEmployeeRequest, CreatedEmployeeResult } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const createSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  email: z.email('E-mail inválido'),
});
type CreateForm = z.infer<typeof createSchema>;

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<CreatedEmployeeResult | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [successResetTitle, setSuccessResetTitle] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) { router.replace('/login'); return; }
    if (claims.isMaster || !claims.companyId) router.replace('/condominiums');
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['company-employees'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Employee[]>>('/companies/me/users');
      return res.data.data;
    },
    retry: false,
  });

  useEffect(() => {
    if ((error as { response?: { status?: number } })?.response?.status === 403) {
      toast.error('Você não tem permissão para gerenciar funcionários.');
      router.replace('/condominiums');
    }
  }, [error, router]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const resetMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.post<ApiEnvelope<CreatedEmployeeResult>>(
        `/companies/me/users/${userId}/reset-password`,
      );
      return res.data.data;
    },
    onSuccess: (result, userId) => {
      const target = resetTarget;
      setResetTarget(null);
      setSuccessResult({ ...result, nome: target?.nome ?? `Usuário #${userId}` });
      setSuccessResetTitle(`Senha de ${target?.nome ?? 'usuário'} resetada`);
      toast.success('Senha resetada');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao resetar senha';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao resetar senha');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateEmployeeRequest) => {
      const res = await api.post<ApiEnvelope<CreatedEmployeeResult>>('/companies/me/users', form);
      return res.data.data;
    },
    onSuccess: (result) => {
      toast.success('Funcionário criado');
      setCreateOpen(false);
      setSuccessResult(result);
      setSuccessResetTitle(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['company-employees'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao criar funcionário';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao criar funcionário');
    },
  });

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.tempPassword);
    toast.success('Senha copiada');
  }

  const filtered = data
    ? data.filter((e) => {
        const q = search.toLowerCase();
        return e.nome.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Funcionários</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie os funcionários da sua empresa</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={
              <Button className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Novo funcionário
              </Button>
            } />
            <DialogContent>
              <DialogHeader><DialogTitle>Criar funcionário</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input placeholder="Maria Souza" {...register('nome')} />
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="maria@empresa.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full cursor-pointer" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar funcionário'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Busca */}
        {(data?.length ?? 0) > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum funcionário cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione funcionários para que possam acessar o sistema.</p>
          </div>
        )}

        {data && data.length > 0 && search && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum funcionário encontrado para &quot;{search}&quot;.
          </p>
        )}

        {data && filtered.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left">Nome</th>
                    <th className="px-5 py-3 text-left">E-mail</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employee) => (
                    <tr key={employee.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{employee.nome}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => setResetTarget(employee)}
                          className="gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Resetar senha
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
              {filtered.length} funcionário(s){search && filtered.length !== data.length && ` (de ${data.length})`}
            </div>
          </div>
        )}
      </div>

      {/* Confirmação reset */}
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

      {/* Modal credenciais */}
      <Dialog open={!!successResult} onOpenChange={(o) => { if (!o) { setSuccessResult(null); setSuccessResetTitle(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{successResetTitle ?? 'Funcionário criado com sucesso'}</DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">
                <strong>{successResult.nome}</strong>
                {successResetTitle ? ' teve a senha resetada.' : ' cadastrado(a).'}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Credenciais
                </p>
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
                <Button onClick={() => { setSuccessResult(null); setSuccessResetTitle(null); }} className="cursor-pointer">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
