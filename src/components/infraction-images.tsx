'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, ApiEnvelope } from '@/lib/api';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

type ImageMeta = {
  id: number;
  filename: string;
  mimetype: string;
  sizeBytes: number;
  uploadedAt: string;
};

function useAuthedBlobUrl(infractionId: string, imageId: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/infractions/${infractionId}/images/${imageId}`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        if (!cancelled) setUrl(objectUrl);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [infractionId, imageId]);
  return url;
}

function Thumbnail({
  infractionId,
  image,
  onClick,
  onDelete,
}: {
  infractionId: string;
  image: ImageMeta;
  onClick: () => void;
  onDelete: () => void;
}) {
  const url = useAuthedBlobUrl(infractionId, image.id);
  return (
    <div className="group relative overflow-hidden rounded border border-slate-200">
      <button
        onClick={onClick}
        className="block h-32 w-full cursor-zoom-in bg-slate-100"
        title={image.filename}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={image.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Carregando...
          </div>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 right-1 rounded bg-white/90 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 hover:bg-red-100"
        title="Remover"
      >
        🗑️
      </button>
    </div>
  );
}

export function InfractionImages({ infractionId }: { infractionId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImage, setLightboxImage] = useState<ImageMeta | null>(null);
  const [deleting, setDeleting] = useState<ImageMeta | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [] } = useQuery({
    queryKey: ['infraction-images', infractionId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<ImageMeta[]>>(
        `/infractions/${infractionId}/images`,
      );
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      await api.delete(`/infractions/${infractionId}/images/${imageId}`);
    },
    onSuccess: () => {
      toast.success('Imagem removida');
      setDeleting(null);
      queryClient.invalidateQueries({
        queryKey: ['infraction-images', infractionId],
      });
    },
    onError: () => toast.error('Erro ao remover imagem'),
  });

  const lightboxUrl = useAuthedBlobUrl(infractionId, lightboxImage?.id ?? 0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      toast.error(
        `Você pode anexar mais ${remaining} imagem(ns). Limite total: ${MAX_IMAGES}.`,
      );
      return;
    }
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIMES.includes(file.type)) {
        toast.error(
          `Arquivo "${file.name}" tem tipo não suportado (${file.type}).`,
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(
          `Arquivo "${file.name}" excede 5MB.`,
        );
        return;
      }
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/infractions/${infractionId}/images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(`${files.length} imagem(ns) enviada(s)`);
      queryClient.invalidateQueries({
        queryKey: ['infraction-images', infractionId],
      });
    } catch {
      toast.error('Erro durante upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const canUpload = images.length < MAX_IMAGES && !uploading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Evidências</CardTitle>
          <span className="text-xs text-slate-500">
            {images.length} de {MAX_IMAGES}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {images.length === 0 && !uploading && (
          <p className="text-sm text-slate-500">
            Nenhuma imagem anexada. Use o botão abaixo para adicionar
            evidências (JPEG, PNG ou WebP, máx 5MB cada).
          </p>
        )}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <Thumbnail
                key={img.id}
                infractionId={infractionId}
                image={img}
                onClick={() => setLightboxImage(img)}
                onDelete={() => setDeleting(img)}
              />
            ))}
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            disabled={!canUpload}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? 'Enviando...'
              : images.length >= MAX_IMAGES
                ? `Limite de ${MAX_IMAGES} atingido`
                : '+ Adicionar imagens'}
          </Button>
        </div>
      </CardContent>

      {/* Lightbox */}
      <Dialog
        open={!!lightboxImage}
        onOpenChange={(o) => !o && setLightboxImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{lightboxImage?.filename}</DialogTitle>
          </DialogHeader>
          {lightboxImage && lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt={lightboxImage.filename}
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover imagem</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Remover <strong>{deleting?.filename}</strong>? Esta ação não pode
            ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                deleting && deleteMutation.mutate(deleting.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
