import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api';

/**
 * Wrapper de `useMutation` que dispara `toast.error(getErrorMessage(err))`
 * automaticamente em caso de falha, eliminando o `onError` repetido em cada página.
 *
 * - `errorMessage`: fallback exibido quando o backend não retorna mensagem.
 * - `onError` opcional ainda é chamado depois do toast, para lógica extra.
 */
export function useApiMutation<TData, TVariables = void, TError = unknown>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    errorMessage?: string;
  },
) {
  const { errorMessage, onError, ...rest } = options;
  return useMutation<TData, TError, TVariables>({
    ...rest,
    onError: (...args: Parameters<NonNullable<typeof onError>>) => {
      toast.error(getErrorMessage(args[0], errorMessage));
      onError?.(...args);
    },
  });
}
