import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api';

/**
 * Wrapper de `useMutation` que dispara `toast.error(getErrorMessage(err))`
 * automaticamente em caso de falha, eliminando o `onError` repetido em cada página.
 *
 * - `errorMessage`: fallback exibido quando o backend não retorna mensagem.
 * - `onError` opcional: se retornar `true` (= "já tratei"), o toast genérico é
 *   suprimido. Se retornar `undefined`/`false`, o toast genérico dispara normalmente.
 *   Chamadores que não passam `onError` têm comportamento idêntico ao anterior.
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
      const handled = onError?.(...args);
      if (!handled) toast.error(getErrorMessage(args[0], errorMessage));
    },
  });
}
