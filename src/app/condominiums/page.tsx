'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Condominium } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  address: z.string().min(1, 'Endereço obrigatório'),
});

type CreateForm = z.infer<typeof createSchema>;

export default function CondominiumsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!authStorage.get()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Condominium>>>(
        '/condominiums?page=1&limit=20',
      );
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
    mutationFn: async (form: CreateForm) => {
      const res = await api.post<ApiEnvelope<Condominium>>('/condominiums', form);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Condomínio criado');
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Erro ao criar condomínio'),
  });

  function logout() {
    authStorage.clear();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Meus condomínios</h1>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button />}>+ Novo condomínio</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar condomínio</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input placeholder="Condomínio Jardim das Flores" {...register('name')} />
                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>CNPJ</Label>
                    <Input placeholder="12345678000195" {...register('cnpj')} />
                    {errors.cnpj && <p className="text-sm text-red-600">{errors.cnpj.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Endereço</Label>
                    <Input placeholder="Rua das Acácias, 100 - São Paulo, SP" {...register('address')} />
                    {errors.address && (
                      <p className="text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}
        {error && <p className="text-red-600">Erro ao carregar condomínios</p>}

        {data && (
          <>
            {data.data.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Você ainda não é membro de nenhum condomínio.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map((c) => (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => router.push(`/condominiums/${c.id}`)}
                  >
                    <CardHeader>
                      <CardTitle>{c.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                      <p>CNPJ: {c.cnpj}</p>
                      <p>{c.address}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-500">
              Total: {data.total} · Página {data.page} de{' '}
              {Math.max(1, Math.ceil(data.total / data.limit))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
