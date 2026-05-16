'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiEnvelope, PaginatedResult } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Condominium } from '@/lib/types';

export default function CondominiumsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!authStorage.get()) {
      router.replace('/login');
    }
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaginatedResult<Condominium>>>(
        '/condominiums?page=1&limit=20',
      );
      return res.data.data;
    },
  });

  function logout() {
    authStorage.clear();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Meus condomínios</h1>
          <Button variant="outline" onClick={logout}>
            Sair
          </Button>
        </div>

        {isLoading && <p className="text-slate-600">Carregando...</p>}
        {error && <p className="text-red-600">Erro ao carregar condomínios</p>}

        {data && (
          <>
            {data.data.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Você ainda não é membro de nenhum condomínio.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map((c) => (
                  <Card key={c.id} className="cursor-pointer hover:shadow-md transition">
                    <CardHeader>
                      <CardTitle>{c.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                      <p>CNPJ: {c.cnpj}</p>
                      <p>{c.address}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-500">
              Total: {data.total} · Página {data.page} de {Math.max(1, Math.ceil(data.total / data.limit))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
