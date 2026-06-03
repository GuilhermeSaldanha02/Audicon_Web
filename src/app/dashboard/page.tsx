'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, CheckCircle, Send, TrendingUp,
  BarChart3, AlertTriangle,
} from 'lucide-react';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { DashboardResult, Infraction, InfractionSeverity, InfractionStatus } from '@/lib/types';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth-context';

const STATUS_CONFIG: Record<InfractionStatus, { label: string; color: string; bar: string }> = {
  pending:  { label: 'Pendente',  color: 'text-amber-600',  bar: 'bg-amber-400' },
  analyzed: { label: 'Analisado', color: 'text-blue-600',   bar: 'bg-blue-500' },
  approved: { label: 'Aprovado',  color: 'text-violet-600', bar: 'bg-violet-500' },
  sent:     { label: 'Enviado',   color: 'text-emerald-600',bar: 'bg-emerald-500' },
};

const SUMMARY_CARDS = (data: DashboardResult) => [
  {
    label: 'Total de infrações',
    value: data.totalInfractions,
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
  {
    label: 'Aprovadas',
    value: (data.byStatus.approved ?? 0) + (data.byStatus.sent ?? 0),
    icon: CheckCircle,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    valueColor: 'text-violet-600',
  },
  {
    label: 'Enviadas',
    value: data.byStatus.sent ?? 0,
    icon: Send,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-600',
  },
  {
    label: 'Taxa de aprovação',
    value: `${data.approvalRate}%`,
    icon: TrendingUp,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    valueColor: 'text-accent',
  },
];

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardWrapper />
    </RequireAuth>
  );
}

function DashboardWrapper() {
  const { claims } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (claims?.role === 'MASTER') {
      router.replace('/master/companies');
    }
  }, [claims, router]);

  if (claims?.role === 'MASTER') return null;

  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

const SEVERITY_DONUT_CONFIG: Record<InfractionSeverity, { label: string; color: string; bg: string }> = {
  LEVE:  { label: 'Leve',  color: 'var(--sev-leve)',  bg: 'var(--sev-leve-bg)' },
  MEDIA: { label: 'Média', color: 'var(--sev-media)', bg: 'var(--sev-media-bg)' },
  GRAVE: { label: 'Grave', color: 'var(--sev-grave)', bg: 'var(--sev-grave-bg)' },
};

function SeverityDonut({ counts }: { counts: Record<InfractionSeverity, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Sem dados de gravidade
      </div>
    );
  }

  const entries = (Object.keys(SEVERITY_DONUT_CONFIG) as InfractionSeverity[]).map((sev) => ({
    sev,
    count: counts[sev],
    pct: total > 0 ? (counts[sev] / total) * 100 : 0,
    ...SEVERITY_DONUT_CONFIG[sev],
  }));

  // Build SVG donut
  const r = 40;
  const cx = 56;
  const cy = 56;
  const strokeW = 16;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const slices = entries.map((e) => {
    const dashArray = (e.pct / 100) * circumference;
    const slice = { ...e, dashArray, dashOffset: circumference - offset };
    offset += dashArray;
    return slice;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeW} />
        {slices.map((s) => s.count > 0 && (
          <circle
            key={s.sev}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={`${s.dashArray} ${circumference}`}
            strokeDashoffset={-circumference + slices.slice(0, slices.indexOf(s)).reduce((a, x) => a + x.dashArray, 0)}
          />
        ))}
      </svg>
      <div className="space-y-2 text-sm flex-1">
        {entries.map((e) => (
          <div key={e.sev} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-foreground">{e.label}</span>
            </div>
            <span className="font-semibold text-foreground">
              {e.count} <span className="font-normal text-muted-foreground">({Math.round(e.pct)}%)</span>
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">Total: {total}</p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<DashboardResult>>('/dashboard');
      return res.data.data;
    },
  });

  // Fetch infractions for severity aggregation (client-side).
  // Note: GET /dashboard does not return severity data; we aggregate from the
  // infraction list. limit=100 é o máximo aceito pela paginação do backend
  // (PaginationDto @Max(100)); o donut agrega até 100 infrações do escopo.
  const { data: infractionsForSeverity } = useQuery({
    queryKey: ['infractions-severity-dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Infraction>>>(
        '/infractions?limit=100',
      );
      return res.data.data;
    },
  });

  const severityCounts: Record<InfractionSeverity, number> = { LEVE: 0, MEDIA: 0, GRAVE: 0 };
  if (infractionsForSeverity?.data) {
    for (const inf of infractionsForSeverity.data) {
      if (inf.severity === 'LEVE' || inf.severity === 'MEDIA' || inf.severity === 'GRAVE') {
        severityCounts[inf.severity]++;
      }
    }
  }

  const maxMonth = data ? Math.max(...data.byMonth.map((m) => m.count), 1) : 1;

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral das infrações registradas</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY_CARDS(data).map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                      <Icon className={`h-4 w-4 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Por status */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Por status</h2>
              </div>
              <div className="space-y-4">
                {(Object.keys(STATUS_CONFIG) as InfractionStatus[]).map((s) => {
                  const count = data.byStatus[s] ?? 0;
                  const pct = data.totalInfractions > 0
                    ? Math.round((count / data.totalInfractions) * 100) : 0;
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <div key={s}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-foreground">{cfg.label}</span>
                        <span className={`text-sm font-semibold ${cfg.color}`}>
                          {count} <span className="font-normal text-muted-foreground">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por gravidade */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Por gravidade</h2>
              </div>
              <SeverityDonut counts={severityCounts} />
            </div>

            {/* Por mês */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Últimos 6 meses</h2>
              </div>
              {data.byMonth.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Sem dados para exibir
                </div>
              ) : (
                <div className="flex items-end gap-3 h-32">
                  {data.byMonth.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{m.count}</span>
                      <div
                        className="w-full rounded-t-sm bg-accent transition-all duration-500"
                        style={{ height: `${Math.max(4, Math.round((m.count / maxMonth) * 88))}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{m.month.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top reincidentes */}
          {data.topUnits.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-foreground">Top 5 unidades reincidentes</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left">#</th>
                    <th className="px-6 py-3 text-left">Unidade</th>
                    <th className="px-6 py-3 text-left">Condomínio</th>
                    <th className="px-6 py-3 text-right">Infrações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topUnits.map((u, i) => (
                    <tr key={u.unitId} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="px-6 py-3 font-semibold text-foreground">{u.identifier}</td>
                      <td className="px-6 py-3 text-muted-foreground">{u.condominiumName}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                          {u.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
