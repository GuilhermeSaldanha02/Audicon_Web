'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Company, Employee, CreatedEmployeeResult } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

export default function MasterCompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [successResult, setSuccessResult] = useState<
    (CreatedEmployeeResult & { nome: string }) | null
  >(null);

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (!claims.isMaster) {
      router.replace('/condominiums');
    }
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
      const res = await api.get<ApiEnvelope<Employee[]>>(
        `/companies/${companyId}/users`,
      );
      return res.data.data;
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
      });
      toast.success('Senha resetada');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao resetar senha';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao resetar senha');
    },
  });

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.tempPassword);
    toast.success('Senha copiada');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <BrandHeader />
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/master/companies')}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{company?.name ?? 'Carregando...'}</h1>
            {company && (
              <p className="text-sm text-slate-500">
                CNPJ: {company.cnpj} · criada em{' '}
                {new Date(company.createdAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários da empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <p className="px-4 py-4 text-sm text-slate-500">Carregando...</p>
            )}
            {!isLoading && (!users || users.length === 0) && (
              <p className="px-4 py-4 text-sm text-slate-500">
                Nenhum usuário cadastrado nesta empresa.
              </p>
            )}
            {users && users.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Nome</th>
                      <th className="px-4 py-2">E-mail</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 text-slate-400">{u.id}</td>
                        <td className="px-4 py-3 font-medium">{u.nome}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResetTarget(u)}
                          >
                            🔄 Resetar senha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmação de reset */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                Você está prestes a resetar a senha de{' '}
                <strong>{resetTarget.nome}</strong> ({resetTarget.email}).
                Uma nova senha temporária será gerada.
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de sucesso com senha temporária */}
      <Dialog
        open={!!successResult}
        onOpenChange={(o) => !o && setSuccessResult(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Senha de {successResult?.nome} resetada
            </DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded bg-green-50 p-3 text-sm text-green-900">
                A senha foi atualizada com sucesso.
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  CREDENCIAIS
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
                  exibida novamente.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setSuccessResult(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
