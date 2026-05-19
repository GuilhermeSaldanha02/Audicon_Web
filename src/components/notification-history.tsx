'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiEnvelope } from '@/lib/api';
import { Notification, NotificationStatus } from '@/lib/types';

const STATUS_LABEL: Record<NotificationStatus, string> = {
  sent: 'Enviada',
  delivered: 'Entregue',
  opened: 'Aberta',
  clicked: 'Link clicado',
  bounced: 'Devolvida',
  failed: 'Falhou',
};

const STATUS_COLOR: Record<NotificationStatus, string> = {
  sent: 'bg-slate-100 text-slate-700',
  delivered: 'bg-blue-100 text-blue-800',
  opened: 'bg-green-100 text-green-800',
  clicked: 'bg-emerald-100 text-emerald-800',
  bounced: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

const CHANNEL_ICON = {
  email: '📧',
  whatsapp: '💬',
};

export function NotificationHistory({ infractionId }: { infractionId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['infraction-notifications', infractionId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Notification[]>>(
        `/infractions/${infractionId}/notifications`,
      );
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de notificações</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <p className="px-4 py-4 text-sm text-slate-500">Carregando...</p>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <p className="px-4 py-4 text-sm text-slate-500">
            Nenhuma notificação enviada ainda.
          </p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Canal</th>
                  <th className="px-4 py-2">Destinatário</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Enviado em</th>
                  <th className="px-4 py-2">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {data.map((n) => (
                  <tr key={n.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2">
                      <span className="mr-1">{CHANNEL_ICON[n.channel]}</span>
                      <span className="text-slate-600">{n.channel}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{n.recipient}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[n.status]}`}
                      >
                        {STATUS_LABEL[n.status]}
                      </span>
                      {n.failureReason && (
                        <span
                          className="ml-2 text-xs text-red-700"
                          title={n.failureReason}
                        >
                          ⚠ {n.failureReason.slice(0, 40)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                      {new Date(n.updatedAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
