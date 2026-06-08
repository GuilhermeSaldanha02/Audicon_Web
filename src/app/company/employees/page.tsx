'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Users,
  Mail,
  Plus,
  Search,
  AlertCircle,
  Copy,
  KeyRound,
  Pencil,
  Ban,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, ApiEnvelope, getErrorMessage } from '@/lib/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth-context';
import type { components } from '@/types/api.generated';

type CompanyUser = components['schemas']['CompanyUserResponseDto'];
type CreatedEmployee = components['schemas']['CreatedEmployeeResponseDto'];

const isInactive = (u: CompanyUser) => !!u.deletedAt;

/**
 * Toast de erro que dá mensagem amigável em conflito de e-mail (409).
 * O e-mail de um funcionário desativado fica "preso" (limitação de Fase F):
 * recriar/editar com ele retorna 409. Sem isto, o usuário veria erro genérico.
 */
function toastMutationError(err: unknown, fallback: string) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 409) {
    toast.error('Este e-mail já está em uso por outro usuário.');
    return;
  }
  toast.error(getErrorMessage(err, fallback));
}

/** Badge de papel (tokens do design). */
function RoleBadge({ role }: { role: CompanyUser['role'] }) {
  const map: Record<CompanyUser['role'], { label: string; cls: string }> = {
    MASTER: { label: 'Master', cls: 'bg-amber-100 text-amber-800' },
    GERENTE: { label: 'Gerente', cls: 'bg-accent-muted text-brand-accent' },
    FUNCIONARIO: { label: 'Funcionário', cls: 'bg-muted text-muted-foreground' },
  };
  const { label, cls } = map[role];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export default function EmployeesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <EmployeesContent />
      </AppShell>
    </RequireAuth>
  );
}

function EmployeesContent() {
  const router = useRouter();
  const { claims, ready } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<CreatedEmployee | null>(null);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [deactivating, setDeactivating] = useState<CompanyUser | null>(null);

  const companyId = claims?.companyId ?? null;
  const isGerente = claims?.role === 'GERENTE';

  // Tela exclusiva do GERENTE (a sidebar só a mostra para ele). FUNCIONARIO/MASTER
  // são mandados para fora — defesa de UI; o backend já barra por RBAC.
  useEffect(() => {
    if (ready && claims && !isGerente) {
      router.replace(claims.isMaster ? '/master/companies' : '/dashboard');
    }
  }, [ready, claims, isGerente, router]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['company-users', companyId, showInactive],
    enabled: !!companyId && isGerente,
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<CompanyUser[]>>(
        `/companies/${companyId}/users${showInactive ? '?includeInactive=true' : ''}`,
      );
      return res.data.data;
    },
  });

  if (!ready || !isGerente) return null;

  const filtered = (data ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Equipe da {claims?.companyName ?? 'sua empresa'}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2 cursor-pointer shrink-0" size="sm">
                <Plus className="h-3.5 w-3.5" /> Novo funcionário
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar funcionário</DialogTitle>
            </DialogHeader>
            <CreateEmployeeForm
              companyId={companyId!}
              onSuccess={(result) => {
                setCreateOpen(false);
                setCreated(result);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca + toggle de inativos */}
      {((data?.length ?? 0) > 0 || showInactive) && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
            className="gap-2 cursor-pointer shrink-0"
          >
            {showInactive ? (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Ocultar inativos
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Mostrar inativos
              </>
            )}
          </Button>
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Erro ao carregar funcionários. Tente novamente.
        </div>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            {showInactive
              ? 'Nenhum funcionário (ativo ou inativo)'
              : 'Nenhum funcionário ativo'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em &quot;Novo funcionário&quot; para criar o primeiro.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {search && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum funcionário encontrado para &quot;{search}&quot;.
            </p>
          )}
          {filtered.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left">Nome</th>
                      <th className="px-5 py-3 text-left">E-mail</th>
                      <th className="px-5 py-3 text-left">Papel</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const inactive = isInactive(u);
                      return (
                        <tr
                          key={u.id}
                          className={`border-t border-border/50 transition-colors ${
                            inactive
                              ? 'bg-muted/20 text-muted-foreground'
                              : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="px-5 py-3 font-medium">
                            <span className="flex items-center gap-2">
                              <span
                                className={
                                  inactive ? '' : 'text-foreground'
                                }
                              >
                                {u.nome}
                              </span>
                              {inactive && (
                                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Inativo
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {u.email}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-5 py-3">
                            {inactive ? (
                              // Linha inativa não fica muda: reativar não existe
                              // ainda (Fase F) e editar/desativar daria 404 no
                              // back (findManageableEmployee filtra deletedAt).
                              <div
                                className="flex justify-end"
                                title="Reativação de funcionário ainda não está disponível."
                              >
                                <span className="text-xs italic text-muted-foreground">
                                  Reativação em breve
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 cursor-pointer"
                                  onClick={() => setEditing(u)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 cursor-pointer text-destructive hover:text-destructive"
                                  onClick={() => setDeactivating(u)}
                                >
                                  <Ban className="h-3.5 w-3.5" /> Desativar
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
                {filtered.length} funcionário(s)
                {search && data && filtered.length < data.length
                  ? ` · filtrando de ${data.length}`
                  : ''}
                {showInactive ? ' · incluindo inativos' : ''}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de sucesso — senha temporária (mostrada uma única vez) */}
      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Funcionário criado</DialogTitle>
          </DialogHeader>
          {created && (
            <TempPasswordPanel created={created} onClose={() => setCreated(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Editar funcionário (nome/e-mail — sem papel) */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar funcionário</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditEmployeeForm
              companyId={companyId!}
              user={editing}
              onSuccess={() => {
                setEditing(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Desativar funcionário (soft-delete) — confirmação com o nome */}
      <Dialog
        open={!!deactivating}
        onOpenChange={(o) => !o && setDeactivating(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar funcionário</DialogTitle>
          </DialogHeader>
          {deactivating && (
            <DeactivateConfirm
              companyId={companyId!}
              user={deactivating}
              onCancel={() => setDeactivating(null)}
              onSuccess={() => {
                setDeactivating(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const employeeSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(120),
  email: z.email('E-mail inválido'),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

function CreateEmployeeForm({
  companyId,
  onSuccess,
}: {
  companyId: number;
  onSuccess: (result: CreatedEmployee) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeForm>({ resolver: zodResolver(employeeSchema) });

  const mutation = useMutation({
    mutationFn: async (form: EmployeeForm) => {
      const res = await api.post<ApiEnvelope<CreatedEmployee>>(
        `/companies/${companyId}/users`,
        form,
      );
      return res.data.data;
    },
    onSuccess: (result) => {
      toast.success('Funcionário criado');
      reset();
      onSuccess(result);
    },
    onError: (err) => toastMutationError(err, 'Erro ao criar funcionário'),
  });

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="space-y-4"
    >
      <p className="text-xs text-muted-foreground">
        O funcionário é criado com o papel <strong>Funcionário</strong> e recebe
        uma senha temporária para o primeiro acesso.
      </p>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input placeholder="Maria Souza" {...register('nome')} />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input
          type="email"
          placeholder="maria@empresa.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Criando...' : 'Criar funcionário'}
      </Button>
    </form>
  );
}

function EditEmployeeForm({
  companyId,
  user,
  onSuccess,
}: {
  companyId: number;
  user: CompanyUser;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { nome: user.nome, email: user.email },
  });

  const mutation = useMutation({
    mutationFn: async (form: EmployeeForm) => {
      // Sem `role` no payload — editar papel seria escalonamento; o back barra
      // por whitelist de qualquer forma (400). Edição = nome/e-mail apenas.
      const res = await api.patch<ApiEnvelope<CompanyUser>>(
        `/companies/${companyId}/users/${user.id}`,
        form,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Funcionário atualizado');
      onSuccess();
    },
    onError: (err) => toastMutationError(err, 'Erro ao atualizar funcionário'),
  });

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input {...register('nome')} />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input type="email" {...register('email')} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>
  );
}

function DeactivateConfirm({
  companyId,
  user,
  onCancel,
  onSuccess,
}: {
  companyId: number;
  user: CompanyUser;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const mutation = useApiMutation({
    errorMessage: 'Erro ao desativar funcionário',
    mutationFn: async () => {
      await api.delete(`/companies/${companyId}/users/${user.id}`);
    },
    onSuccess: () => {
      toast.success(`${user.nome} foi desativado(a)`);
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Desativar <strong>{user.nome}</strong>? Isso{' '}
          <strong>revoga o acesso</strong> imediatamente e{' '}
          <strong>preserva o histórico</strong> (não exclui o registro). A
          reativação ainda não está disponível.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Desativando...' : 'Desativar'}
        </Button>
      </div>
    </div>
  );
}

function TempPasswordPanel({
  created,
  onClose,
}: {
  created: CreatedEmployee;
  onClose: () => void;
}) {
  function copy() {
    navigator.clipboard.writeText(created.tempPassword);
    toast.success('Senha copiada');
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
        <strong>{created.nome}</strong> criado(a) com sucesso.
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" /> Credenciais
        </p>
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm">
            <span className="text-muted-foreground">E-mail:</span>{' '}
            <span className="font-mono">{created.email}</span>
          </p>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Senha temporária:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base border border-border">
                {created.tempPassword}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                className="gap-1.5 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 mt-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Anote esta senha. Por segurança, ela não será exibida novamente.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onClose} className="cursor-pointer">
          Fechar
        </Button>
      </div>
    </div>
  );
}
