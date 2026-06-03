'use client';

/**
 * Change-password page (R-10 Lote 1)
 *
 * CONTRATO COM O BACKEND:
 *   POST /auth/change-password { newPassword: string }
 *   O backend NÃO valida "senha atual" — só recebe newPassword.
 *   O campo "Senha atual (temporária)" existe apenas para UX/orientação do usuário;
 *   ele NÃO é enviado para a API (comentado no corpo do form abaixo).
 *   Se isso mudar no backend, basta adicionar o campo ao request body.
 *
 * GATE: se mustChangePassword === false, o usuário é redirecionado.
 * PÓS-SUCESSO: logout() + redirect para /login (o token precisa ser renovado
 *   com a nova senha — mantém o contrato da implementação anterior).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle, Loader2, Layers, Info } from 'lucide-react';
import { api, type ApiEnvelope } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuth } from '@/lib/auth-context';

const schema = z
  .object({
    newPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirm: z.string().min(1, 'Confirme a senha'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });

type Form = z.infer<typeof schema>;

function getStrength(val: string): { score: number; label: string } {
  if (val.length === 0) return { score: 0, label: '' };
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { score, label: labels[score] ?? '' };
}

const strengthColors = [
  '',
  'bg-[#dc2626]', // Fraca
  'bg-[#d97706]', // Razoável
  'bg-[#d97706]', // Boa
  'bg-[#16a34a]', // Forte
];

function PasswordInput({
  id,
  placeholder,
  registration,
  autoFocus,
}: {
  id: string;
  placeholder: string;
  registration: ReturnType<ReturnType<typeof useForm<Form>>['register']>;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={[
          'w-full rounded-[6px] border border-[#e2e8f0] bg-white py-[9px] pl-3 pr-10',
          'text-[14px] text-[#0f172a] outline-none transition-[border-color,box-shadow] duration-[150ms]',
          'placeholder:text-[#94a3b8]',
          'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]',
        ].join(' ')}
        {...registration}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#64748b] transition-colors hover:text-[#0f172a]"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { claims, ready, logout } = useAuth();
  const [done, setDone] = useState(false);

  // Gate: aguarda hidratação e redireciona se não precisa trocar senha
  useEffect(() => {
    if (!ready) return;
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (!claims.mustChangePassword) {
      // Usuário não precisa trocar senha — redireciona para área principal
      router.replace(claims.isMaster ? '/master/companies' : '/dashboard');
    }
  }, [ready, claims, router]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  // Watch new password for strength indicator
  const watchedNewPw = watch('newPassword', '');
  const strength = getStrength(watchedNewPw);

  const mutation = useApiMutation({
    errorMessage: 'Erro ao alterar senha',
    mutationFn: async (form: Form) => {
      // NOTA: apenas newPassword é enviado — o backend não valida senha atual.
      // Ver comentário no topo do arquivo.
      const res = await api.post<ApiEnvelope<{ message: string }>>(
        '/auth/change-password',
        { newPassword: form.newPassword },
      );
      return res.data.data;
    },
    onSuccess: async () => {
      setDone(true);
      toast.success('Senha alterada com sucesso! Faça login novamente.');
      // Aguarda um momento para o usuário ver o estado de sucesso
      setTimeout(async () => {
        await logout();
        router.replace('/login');
      }, 2000);
    },
  });

  // Não renderiza antes de estar pronto (evita flash)
  if (!ready) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white px-10 py-9">
          {/* Logo */}
          <div className="mb-7 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#172554]">
              <Layers size={16} className="text-white" />
            </div>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-[#0f172a]">
              Audicon
            </span>
          </div>

          {!done ? (
            <>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[#0f172a]">
                Crie sua senha
              </h1>
              <p className="mt-1.5 mb-6 text-[13.5px] leading-relaxed text-[#64748b]">
                Para continuar, defina uma nova senha para a sua conta. Você precisará usá-la nos próximos acessos.
              </p>

              {/* Info banner */}
              <div className="mb-5 flex items-start gap-2 rounded-[6px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-2.5 text-[13px] text-[#1d4ed8]">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>Primeiro acesso detectado. Troque a senha temporária antes de continuar.</span>
              </div>

              <form
                onSubmit={handleSubmit((d) => mutation.mutate(d))}
                noValidate
              >
                {/* Campo "senha atual" — apenas UX/orientação visual.
                    NÃO é enviado para a API (o backend não valida senha atual).
                    Valor ignorado no mutationFn. */}
                <div className="mb-4">
                  <label
                    htmlFor="pw-current"
                    className="mb-1.5 block text-[12.5px] font-medium text-[#0f172a]"
                  >
                    Senha atual (temporária)
                    <span className="ml-1 text-[11px] font-normal text-[#64748b]">
                      — apenas visual, não enviada à API
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="pw-current"
                      type="password"
                      placeholder="Digite a senha recebida por e-mail"
                      className={[
                        'w-full rounded-[6px] border border-[#e2e8f0] bg-white py-[9px] pl-3 pr-10',
                        'text-[14px] text-[#0f172a] outline-none transition-[border-color,box-shadow] duration-[150ms]',
                        'placeholder:text-[#94a3b8]',
                        'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]',
                      ].join(' ')}
                    />
                  </div>
                </div>

                {/* Nova senha */}
                <div className="mb-4">
                  <label
                    htmlFor="pw-new"
                    className="mb-1.5 block text-[12.5px] font-medium text-[#0f172a]"
                  >
                    Nova senha
                  </label>
                  <PasswordInput
                    id="pw-new"
                    placeholder="Mínimo 8 caracteres"
                    registration={register('newPassword')}
                    autoFocus
                  />
                  {/* Strength bar */}
                  {watchedNewPw.length > 0 && (
                    <div className="mt-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={[
                              'h-1 flex-1 rounded-sm transition-colors duration-200',
                              i <= strength.score
                                ? strengthColors[strength.score]
                                : 'bg-[#e2e8f0]',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className="mt-1 text-[11.5px] text-[#64748b]">{strength.label}</p>
                      )}
                    </div>
                  )}
                  {errors.newPassword && (
                    <p className="mt-1 text-[12px] text-[#dc2626]">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirmar */}
                <div className="mb-6">
                  <label
                    htmlFor="pw-confirm"
                    className="mb-1.5 block text-[12.5px] font-medium text-[#0f172a]"
                  >
                    Confirmar nova senha
                  </label>
                  <PasswordInput
                    id="pw-confirm"
                    placeholder="Repita a nova senha"
                    registration={register('confirm')}
                  />
                  {errors.confirm && (
                    <p className="mt-1 text-[12px] text-[#dc2626]">
                      {errors.confirm.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className={[
                    'flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#2563eb] py-[10px]',
                    'text-[14px] font-medium text-white transition-colors duration-[150ms]',
                    'hover:bg-[#1d4ed8] disabled:cursor-default disabled:opacity-60',
                  ].join(' ')}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Definir nova senha'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0fdf4]">
                <CheckCircle size={24} className="text-[#16a34a]" />
              </div>
              <h2 className="mb-2 text-[18px] font-semibold text-[#0f172a]">
                Senha atualizada!
              </h2>
              <p className="text-[13.5px] text-[#64748b]">
                Sua nova senha foi salva. Redirecionando para o login...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
