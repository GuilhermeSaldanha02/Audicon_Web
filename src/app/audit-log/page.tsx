'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AuditAction, AuditLogEntry, Company } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';
import { RequireAuth } from '@/components/require-auth';

const ACTION_LABEL: Record<AuditAction, string> = {
  INFRACTION_CREATED: 'Infração criada',
  INFRACTION_APPROVED: 'Infração aprovada',
  INFRACTION_SENT: 'Enviada por e-mail',
  INFRACTION_WHATSAPP_SENT: 'Enviada por WhatsApp',
  INFRACTION_DELETED: 'Infração removida',
  CONDOMINIUM_CREATED: 'Condomínio criado',
  CONDOMINIUM_DELETED: 'Condomínio removido',
  COMPANY_CREATED: 'Empresa criada',
  COMPANY_DELETED: 'Empresa removida',
  EMPLOYEE_CREATED: 'Funcionário criado',
  EMPLOYEE_PASSWORD_RESET: 'Senha resetada',
};

const ACTION_BADGE: Record<AuditAction, string> = {
  INFRACTION_CREATED:      'bg-blue-100 text-blue-800',
  INFRACTION_APPROVED:     'bg-violet-100 text-violet-800',
  INFRACTION_SENT:         'bg-emerald-100 text-emerald-800',
  INFRACTION_WHATSAPP_SENT:'bg-teal-100 text-teal-800',
  INFRACTION_DELETED:      'bg-red-100 text-red-800',
  CONDOMINIUM_CREATED:     'bg-cyan-100 text-cyan-800',
  CONDOMINIUM_DELETED:     'bg-red-100 text-red-800',
  COMPANY_CREATED:         'bg-amber-100 text-amber-800',
  COMPANY_DELETED:         'bg-red-100 text-red-800',
  EMPLOYEE_CREATED:        'bg-orange-100 text-orange-800',
  EMPLOYEE_PASSWORD_RESET: 'bg-slate-100 text-slate-800',
};

export default function AuditLogPage() {
  return (
    <RequireAuth>
      <AuditLogContent />
    </RequireAuth>
  );
}

function AuditLogContent() {
  const [page, setPage] = useState(1);
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const isMaster = !!useAuth().claims?.isMaster;
  const limit = 25;

  const companiesQuery = useQuery({
    queryKey: ['master-companies-for-filter'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Company[]>>('/companies');
      return res.data.data;
    },
    enabled: isMaster,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, companyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (isMaster && companyFilter) params.append('companyId', String(companyFilter));
      const res = await api.get<ApiEnvelope<PaginatedResult<AuditLogEntry>>>(
        `/audit-log?${params.toString()}`,
      );
      return res.data.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <BrandHeader />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registro de ações sensíveis no sistema
            </p>
          </div>
          {isMaster && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Empresa:</label>
              <select
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value === '' ? '' : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {companiesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum registro encontrado</p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left whitespace-nowrap">Data/hora</th>
                    <th className="px-5 py-3 text-left">Ação</th>
                    <th className="px-5 py-3 text-left">Usuário</th>
                    <th className="px-5 py-3 text-left">Entidade</th>
                    <th className="px-5 py-3 text-left">Contexto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entry) => (
                    <tr key={entry.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ACTION_BADGE[entry.action] ?? 'bg-muted text-muted-foreground'
                        }`}>
                          {ACTION_LABEL[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        {entry.userEmail ?? '—'}
                        {entry.userIsMaster && (
                          <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                            master
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {entry.entity}
                        {entry.entityId != null && (
                          <span className="text-muted-foreground/60"> #{entry.entityId}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {entry.context && (
                          <code className="block max-w-xs truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {JSON.stringify(entry.context)}
                          </code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.total} registro(s) · Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1 cursor-pointer">
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)} className="gap-1 cursor-pointer">
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
