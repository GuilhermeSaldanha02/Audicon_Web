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
  Company,
  CreateCompanyRequest,
  CreatedCompanyResult,
} from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  admin: z.object({
    nome: z.string().min(1, 'Nome do admin obrigatório'),
    email: z.email('E-mail inválido'),
  }),
});

type CreateForm = z.infer<typeof createSchema>;

export default function MasterCompaniesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [successResult, setSuccessResult] =
    useState<CreatedCompanyResult | null>(null);

  // Client-side guard: redirect se não-master
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

  const { data, isLoading } = useQuery({
    queryKey: ['master-companies'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Company[]>>('/companies');
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const createMutation = useMutation({
    mutationFn: async (form: CreateCompanyRequest) => {
      const res = await api.post<ApiEnvelope<CreatedCompanyResult>>(
        '/companies',
        form,
      );
      return res.data.data;
    },
    onSuccess: (result) => {
      toast.success('Empresa criada');
      setCreateOpen(false);
      setSuccessResult(result);
      reset();
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? 'Erro ao criar empresa';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao criar empresa');
    },
  });

  function copyPassword() {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.admin.tempPassword);
    toast.success('Senha copiada');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Empresas</h1>
            <p className="text-sm text-slate-500">
              Administre as empresas (administradoras) que usam o sistema.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>+ Nova empresa</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar empresa</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Nome da empresa</Label>
                  <Input
                    placeholder="Administradora Exemplo Ltda"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input
                    placeholder="12.345.678/0001-90"
                    {...register('cnpj')}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-red-600">{errors.cnpj.message}</p>
                  )}
                </div>
                <div className="rounded border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    USUÁRIO ADMINISTRADOR INICIAL
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Nome</Label>
                      <Input
                        placeholder="João da Silva"
                        {...register('admin.nome')}
                      />
                      {errors.admin?.nome && (
                        <p className="text-sm text-red-600">
                          {errors.admin.nome.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        placeholder="joao@empresa.com"
                        {...register('admin.email')}
                      />
                      {errors.admin?.email && (
                        <p className="text-sm text-red-600">
                          {errors.admin.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar empresa'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}

        {data && data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Nenhuma empresa cadastrada ainda.
            </CardContent>
          </Card>
        )}

        {data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((company) => (
              <Card
                key={company.id}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => router.push(`/master/companies/${company.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{company.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-500">
                  <p>CNPJ: {company.cnpj}</p>
                  <p>
                    Criada em{' '}
                    {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="mt-2 text-xs text-blue-600">
                    Clique para gerenciar usuários →
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de sucesso com senha temporária */}
      <Dialog
        open={!!successResult}
        onOpenChange={(o) => !o && setSuccessResult(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empresa criada com sucesso</DialogTitle>
          </DialogHeader>
          {successResult && (
            <div className="space-y-4">
              <div className="rounded bg-green-50 p-3">
                <p className="text-sm text-green-900">
                  <strong>{successResult.company.name}</strong> cadastrada
                  (CNPJ {successResult.company.cnpj}).
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  CREDENCIAIS DO ADMINISTRADOR
                </p>
                <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm">
                    <span className="text-slate-600">E-mail:</span>{' '}
                    <span className="font-mono">
                      {successResult.admin.email}
                    </span>
                  </p>
                  <div>
                    <p className="text-sm text-slate-600">Senha temporária:</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base">
                        {successResult.admin.tempPassword}
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
