'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
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
import { Condominium, Unit } from '@/lib/types';

const unitSchema = z.object({
  identifier: z.string().min(1, 'Identificador obrigatório'),
  ownerName: z.string().min(1, 'Nome do proprietário obrigatório'),
});

type UnitForm = z.infer<typeof unitSchema>;

export default function CondominiumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const condominiumId = params.id as string;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
      const res = await api.get<ApiEnvelope<PaginatedResult<Unit>>>(
        `/condominiums/${condominiumId}/units?page=1&limit=50`,
      );
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitForm>({ resolver: zodResolver(unitSchema) });

  const createUnit = useMutation({
    mutationFn: async (form: UnitForm) => {
      const res = await api.post<ApiEnvelope<Unit>>(
        `/condominiums/${condominiumId}/units`,
        form,
      );
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/condominiums')}>
            ← Voltar
          </Button>
          {loadingCondominium ? (
            <p className="text-slate-600">Carregando...</p>
          ) : (
            <div>
              <h1 className="text-3xl font-bold">{condominium?.name}</h1>
              <p className="text-sm text-slate-500">
                CNPJ: {condominium?.cnpj} · {condominium?.address}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Unidades</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>+ Nova unidade</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar unidade</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) => createUnit.mutate(d))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Identificador</Label>
                  <Input placeholder="A-101" {...register('identifier')} />
                  {errors.identifier && (
                    <p className="text-sm text-red-600">{errors.identifier.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Nome do proprietário</Label>
                  <Input placeholder="João da Silva" {...register('ownerName')} />
                  {errors.ownerName && (
                    <p className="text-sm text-red-600">{errors.ownerName.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createUnit.isPending}>
                  {createUnit.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingUnits && <p className="text-slate-600">Carregando unidades...</p>}

        {units && (
          <>
            {units.data.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Nenhuma unidade cadastrada.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {units.data.map((u) => (
                  <Card
                    key={u.id}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() =>
                      router.push(`/condominiums/${condominiumId}/units/${u.id}/infractions`)
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{u.identifier}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                      <p>{u.ownerName}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-500">Total: {units.total} unidades</p>
          </>
        )}
      </div>
    </div>
  );
}
