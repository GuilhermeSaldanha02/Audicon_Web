'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { LoginRequest, LoginResponse } from '@/lib/types';

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      authStorage.set(data.access_token);
      toast.success('Login realizado');
      const claims = authStorage.getClaims();
      if (claims?.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push(claims?.isMaster ? '/master/companies' : '/condominiums');
      }
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number; data?: { message?: unknown } }; code?: string };
      if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.code === 'ECONNREFUSED') {
        toast.error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
      } else if (axiosErr?.response?.status === 401) {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error(`Erro ao fazer login (${axiosErr?.response?.status ?? axiosErr?.code ?? 'desconhecido'})`);
      }
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-none flex-col items-center justify-center bg-primary px-12 text-primary-foreground">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Audicon</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-snug">
              Gestão inteligente de condomínios
            </h1>
            <p className="text-primary-foreground/70 leading-relaxed">
              Registre infrações, gere documentos com IA e notifique moradores — tudo em um único lugar.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            {[
              'Análise de infrações com IA',
              'Geração automática de PDF',
              'Notificações por e-mail e WhatsApp',
              'Histórico completo de ocorrências',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-accent shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center overflow-y-auto bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Audicon</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gap-2 cursor-pointer"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                'Entrando...'
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
