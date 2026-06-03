'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, Loader2, Layers } from 'lucide-react';
import { api, type ApiEnvelope } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { LoginRequest, LoginResponse } from '@/lib/types';

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    onSuccess: async () => {
      setErrorMsg(null);
      // R-08: cookie httpOnly já setado. Hidrata claims via /auth/profile.
      const claims = await refresh();
      if (claims?.mustChangePassword) {
        router.push('/change-password');
      } else {
        // R-10: não-master redireciona para /dashboard (era /condominiums)
        router.push(claims?.isMaster ? '/master/companies' : '/dashboard');
      }
    },
    onError: (err: unknown) => {
      const axiosErr = err as {
        response?: { status?: number };
        code?: string;
      };
      if (
        axiosErr?.code === 'ERR_NETWORK' ||
        axiosErr?.code === 'ECONNREFUSED'
      ) {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
      } else if (axiosErr?.response?.status === 401) {
        setErrorMsg('E-mail ou senha inválidos. Verifique e tente novamente.');
      } else {
        setErrorMsg(
          `Erro ao fazer login (${axiosErr?.response?.status ?? axiosErr?.code ?? 'desconhecido'})`,
        );
      }
    },
  });

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#172554] p-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 60% 30%, rgba(37,99,235,0.18) 0%, transparent 60%)',
      }}
    >
      <div className="relative w-full max-w-[380px]">
        {/* Brand */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563eb]">
            <Layers size={18} className="text-white" />
          </div>
          <span className="text-[22px] font-bold tracking-[-0.02em] text-white">
            Audicon
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white px-8 py-9 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[#0f172a]">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 mb-6 text-[13px] text-[#64748b]">
            Acesso restrito a funcionários autorizados.
          </p>

          {/* Error alert */}
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-[6px] border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-[12.5px] text-[#7f1d1d]">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit((d) => {
              setErrorMsg(null);
              mutation.mutate(d);
            })}
            noValidate
          >
            {/* Email */}
            <div className="mb-3.5 flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[13px] font-medium text-[#0f172a]"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className={[
                  'w-full rounded-[6px] border bg-white px-3 py-[9px] text-[13.5px] text-[#0f172a]',
                  'outline-none transition-[border-color,box-shadow] duration-[120ms]',
                  'placeholder:text-[#94a3b8]',
                  'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]',
                  errors.email
                    ? 'border-[#dc2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]'
                    : 'border-[#e2e8f0]',
                ].join(' ')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[12px] text-[#dc2626]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6 flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-[#0f172a]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={[
                    'w-full rounded-[6px] border bg-white py-[9px] pl-3 pr-10 text-[13.5px] text-[#0f172a]',
                    'outline-none transition-[border-color,box-shadow] duration-[120ms]',
                    'placeholder:text-[#94a3b8]',
                    'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]',
                    errors.password
                      ? 'border-[#dc2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]'
                      : 'border-[#e2e8f0]',
                  ].join(' ')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded p-0.5 text-[#94a3b8] transition-colors hover:text-[#0f172a]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-[#dc2626]">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={[
                'flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#2563eb] py-[10px]',
                'text-[14px] font-semibold text-white transition-colors duration-[120ms]',
                'hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-65',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]',
              ].join(' ')}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="mt-6 border-t border-[#e2e8f0] pt-4 text-center text-[11.5px] text-[#94a3b8]">
            Audicon © 2025 — Gestão de Infrações em Condomínios
          </p>
        </div>
      </div>
    </div>
  );
}
