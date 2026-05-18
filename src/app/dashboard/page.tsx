'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiEnvelope } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { DashboardResult, InfractionStatus } from '@/lib/types';
import { BrandHeader } from '@/components/brand-header';

const STATUS_LABEL: Record<InfractionStatus, string> = {
  pending: 'Pendente',
  analyzed: 'Analisado',
  approved: 'Aprovado',
  sent: 'Enviado',
};

const STATUS_COLOR: Record<InfractionStatus, string> = {
  pending: 'bg-yellow-400',
  analyzed: 'bg-blue-400',
  approved: 'bg-purple-400',
  sent: 'bg-green-400',
};

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const claims = authStorage.getClaims();
    if (!claims) router.replace('/login');
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<DashboardResult>>('/dashboard');
      return res.data.data;
    },
  });

  const maxMonth = data ? Math.max(...data.byMonth.map((m) => m.count), 1) : 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader />
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral das infrações</p>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}

        {data && (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-500">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.totalInfractions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-500">Aprovadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">
                    {(data.byStatus.approved ?? 0) + (data.byStatus.sent ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-500">Enviadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{data.byStatus.sent ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-500">Taxa aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{data.approvalRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Por status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(STATUS_LABEL) as InfractionStatus[]).map((s) => {
                  const count = data.byStatus[s] ?? 0;
                  const pct = data.totalInfractions > 0
                    ? Math.round((count / data.totalInfractions) * 100)
                    : 0;
                  return (
                    <div key={s}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{STATUS_LABEL[s]}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${STATUS_COLOR[s]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Por mês */}
            {data.byMonth.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Infrações nos últimos 6 meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-32">
                    {data.byMonth.map((m) => (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs text-slate-500">{m.count}</span>
                        <div
                          className="w-full rounded-t bg-blue-400"
                          style={{ height: `${Math.round((m.count / maxMonth) * 96)}px` }}
                        />
                        <span className="text-xs text-slate-500">{m.month.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top unidades */}
            {data.topUnits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 5 unidades reincidentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Unidade</th>
                        <th className="px-4 py-2">Condomínio</th>
                        <th className="px-4 py-2 text-right">Infrações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUnits.map((u, i) => (
                        <tr key={u.unitId} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">{u.identifier}</td>
                          <td className="px-4 py-2 text-slate-600">{u.condominiumName}</td>
                          <td className="px-4 py-2 text-right font-bold text-red-600">{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
