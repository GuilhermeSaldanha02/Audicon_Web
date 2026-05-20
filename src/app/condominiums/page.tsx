'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2, MapPin, Hash, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus condomínios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie os condomínios vinculados à sua conta
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Novo condomínio
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar condomínio</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input placeholder="Condomínio Jardim das Flores" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input placeholder="12.345.678/0001-95" {...register('cnpj')} />
                  {errors.cnpj && (
                    <p className="text-xs text-destructive">{errors.cnpj.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Rua das Acácias, 100 — São Paulo, SP"
                    {...register('address')}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar condomínio'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* States */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Erro ao carregar condomínios. Tente novamente.
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum condomínio ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você ainda não é membro de nenhum condomínio.
            </p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((c) => (
                <Card
                  key={c.id}
                  className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-accent/30 hover:shadow-md"
                  onClick={() => router.push(`/condominiums/${c.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug mb-3">
                      {c.name}
                    </h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {c.cnpj}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {data.total} · Página {data.page} de{' '}
              {Math.max(1, Math.ceil(data.total / data.limit))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
