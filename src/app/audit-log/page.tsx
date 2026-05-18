'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { AuditAction, AuditLogEntry, Company } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const ACTION_LABEL: Record<AuditAction, string> = {
  INFRACTION_CREATED: 'Infração criada',
  INFRACTION_APPROVED: 'Infração aprovada',
  INFRACTION_SENT: 'Infração enviada por e-mail',
  INFRACTION_WHATSAPP_SENT: 'Infração enviada por WhatsApp',
  INFRACTION_DELETED: 'Infração removida',
  CONDOMINIUM_CREATED: 'Condomínio criado',
  CONDOMINIUM_DELETED: 'Condomínio removido',
  COMPANY_CREATED: 'Empresa criada',
  EMPLOYEE_CREATED: 'Funcionário criado',
};

const ACTION_COLOR: Record<AuditAction, string> = {
  INFRACTION_CREATED: 'bg-blue-100 text-blue-800',
  INFRACTION_APPROVED: 'bg-purple-100 text-purple-800',
  INFRACTION_SENT: 'bg-green-100 text-green-800',
  INFRACTION_WHATSAPP_SENT: 'bg-emerald-100 text-emerald-800',
  INFRACTION_DELETED: 'bg-red-100 text-red-800',
  CONDOMINIUM_CREATED: 'bg-cyan-100 text-cyan-800',
  CONDOMINIUM_DELETED: 'bg-red-100 text-red-800',
  COMPANY_CREATED: 'bg-yellow-100 text-yellow-800',
  EMPLOYEE_CREATED: 'bg-orange-100 text-orange-800',
};

export default function AuditLogPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [isMaster, setIsMaster] = useState(false);
  const limit = 25;

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (!claims.isMaster && !claims.companyId) {
      router.replace('/condominiums');
      return;
    }
    setIsMaster(!!claims.isMaster);
  }, [router]);

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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (isMaster && companyFilter) {
        params.append('companyId', String(companyFilter));
      }
      const res = await api.get<ApiEnvelope<PaginatedResult<AuditLogEntry>>>(
        `/audit-log?${params.toString()}`,
      );
      return res.data.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <BrandHeader />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria</h1>
            <p className="text-sm text-slate-500">
              Registro de ações sensíveis no sistema.
            </p>
          </div>
          {isMaster && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Empresa:</label>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(
                    e.target.value === '' ? '' : Number(e.target.value),
                  );
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {companiesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}

        {data && data.data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Nenhum registro encontrado.
            </CardContent>
          </Card>
        )}

        {data && data.data.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Data/hora</th>
                      <th className="px-4 py-3">Ação</th>
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Entidade</th>
                      <th className="px-4 py-3">Contexto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3 align-top text-slate-700 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              ACTION_COLOR[entry.action] ?? 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {ACTION_LABEL[entry.action] ?? entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {entry.userEmail ?? '—'}
                          {entry.userIsMaster && (
                            <span className="ml-1 text-xs text-amber-700">
                              (master)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {entry.entity}
                          {entry.entityId != null && (
                            <span className="text-slate-500">
                              {' '}
                              #{entry.entityId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {entry.context && (
                            <code className="block max-w-md truncate rounded bg-slate-100 px-2 py-1 text-xs">
                              {JSON.stringify(entry.context)}
                            </code>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Total: {data.total} registro(s) · Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
