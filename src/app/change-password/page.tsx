'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { BrandHeader } from '@/components/brand-header';

const schema = z.object({
  newPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirm: z.string().min(1, 'Confirme a senha'),
}).refine((d) => d.newPassword === d.confirm, {
  path: ['confirm'],
  message: 'As senhas não coincidem',
});

type Form = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) { router.replace('/login'); return; }
    if (!claims.mustChangePassword) { router.replace('/condominiums'); }
  }, [router]);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (form: Form) => {
      const res = await api.post<ApiEnvelope<{ message: string }>>(
        '/auth/change-password',
        { newPassword: form.newPassword },
      );
      return res.data.data;
    },
    onSuccess: async () => {
      toast.success('Senha alterada com sucesso! Faça login novamente.');
      authStorage.clear();
      router.replace('/login');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? 'Erro ao alterar senha';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao alterar senha');
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-6 py-8 space-y-8">
        <BrandHeader />

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Troca de senha obrigatória</p>
              <p className="text-sm text-amber-800 mt-0.5">
                Por segurança, você precisa definir uma nova senha antes de continuar.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h1 className="font-semibold text-foreground">Nova senha</h1>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register('newPassword')}
                autoFocus
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="Repita a nova senha"
                {...register('confirm')}
              />
              {errors.confirm && (
                <p className="text-xs text-destructive">{errors.confirm.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Definir nova senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
