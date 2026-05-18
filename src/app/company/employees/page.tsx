'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  Employee,
  CreateEmployeeRequest,
  CreatedEmployeeResult,
} from '@/lib/types';
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
  const [successResult, setSuccessResult] =
    useState<CreatedEmployeeResult | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [successResetTitle, setSuccessResetTitle] = useState<string | null>(
    null,
  );

  // Guard: precisa ter token + companyId (não-master)
  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (claims.isMaster || !claims.companyId) {
      router.replace('/condominiums');
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['company-employees'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Employee[]>>(
        '/companies/me/users',
      );
      return res.data.data;
    },
    retry: false,
  });

  useEffect(() => {
    if ((error as any)?.response?.status === 403) {
      toast.error(
        'Apenas usuários ADMIN de pelo menos um condomínio podem gerenciar funcionários.',
      );
      router.replace('/condominiums');
    }
  }, [error, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

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
      setSuccessResult({
        ...result,
        nome: target?.nome ?? `Usuário #${userId}`,
      });
      setSuccessResetTitle(`Senha de ${target?.nome ?? 'usuário'} resetada`);
      toast.success('Senha resetada');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao resetar senha';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao resetar senha');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateEmployeeRequest) => {
      const res = await api.post<ApiEnvelope<CreatedEmployeeResult>>(
        '/companies/me/users',
        form,
      );
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
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? 'Erro ao criar funcionário';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao criar funcionário');
    },
  });

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.tempPassword);
    toast.success('Senha copiada');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funcionários</h1>
            <p className="text-sm text-slate-500">
              Gerencie os funcionários da sua empresa.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              + Novo funcionário
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar funcionário</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input placeholder="Maria Souza" {...register('nome')} />
                  {errors.nome && (
                    <p className="text-sm text-red-600">{errors.nome.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="maria@empresa.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? 'Criando...'
                    : 'Criar funcionário'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}

        {data && data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Nenhum funcionário cadastrado ainda.
            </CardContent>
          </Card>
        )}

        {data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((employee) => (
              <Card key={employee.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{employee.nome}</CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => setResetTarget(employee)}
                    >
                      🔄 Resetar senha
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-500">
                  📧 {employee.email}
                </CardContent>
              </Card>
            ))}
            <p className="text-sm text-slate-500">
              Total: {data.length} funcionário(s)
            </p>
          </div>
        )}
      </div>

      {/* Dialog de confirmação de reset */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <>
              <p className="text-sm text-slate-600">
                Uma nova senha temporária será gerada para:
              </p>
              <div className="rounded bg-slate-100 px-3 py-2">
                <p className="text-sm font-medium">{resetTarget.nome}</p>
                <p className="text-xs font-mono text-slate-600">
                  {resetTarget.email}
                </p>
              </div>
              <p className="text-xs text-amber-700">
                ⚠️ A senha atual será invalidada imediatamente.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetTarget(null)}
                  disabled={resetMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => resetMutation.mutate(resetTarget.id)}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Resetando...' : 'Confirmar reset'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de sucesso com senha temporária (criação ou reset) */}
      <Dialog
        open={!!successResult}
        onOpenChange={(o) => {
          if (!o) {
            setSuccessResult(null);
            setSuccessResetTitle(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {successResetTitle ?? 'Funcionário criado com sucesso'}
            </DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded bg-green-50 p-3">
                <p className="text-sm text-green-900">
                  <strong>{successResult.nome}</strong>
                  {successResetTitle
                    ? ' teve a senha resetada.'
                    : ' cadastrado(a).'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  CREDENCIAIS DO FUNCIONÁRIO
                </p>
                <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm">
                    <span className="text-slate-600">E-mail:</span>{' '}
                    <span className="font-mono">{successResult.email}</span>
                  </p>
                  <div>
                    <p className="text-sm text-slate-600">Senha temporária:</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base">
                        {successResult.tempPassword}
                      </code>
                      <Button variant="outline" onClick={copyPassword}>
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-amber-700">
                  ⚠️ Anote esta senha agora. Por segurança, ela não será
                  exibida novamente. Passe ao funcionário e oriente-o a trocar
                  no primeiro acesso.
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setSuccessResult(null);
                    setSuccessResetTitle(null);
                  }}
                >
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
