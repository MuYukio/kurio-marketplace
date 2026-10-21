import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/session';
import { get, http, authStorage } from '@/shared/api/client';
export function useFavorites() {
  const { session } = useAuth();
  const client = useQueryClient(),
    key = ['user', session?.user.id, 'favorites'],
    generation = authStorage.generation();
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => get<string[]>('/favorites', signal),
    enabled: !!session,
  });
  const mutation = useMutation({
    mutationFn: async ({ id, remove }: { id: string; remove: boolean }) =>
      (await http.request<string[]>({ url: `/favorites/${id}`, method: remove ? 'DELETE' : 'PUT' }))
        .data,
    onMutate: async ({ id, remove }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key) || [];
      client.setQueryData(
        key,
        remove ? previous.filter((x) => x !== id) : [...new Set([...previous, id])],
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (authStorage.generation() === generation) client.setQueryData(key, ctx?.previous);
    },
    onSuccess: (favorites) => {
      if (authStorage.generation() === generation) client.setQueryData(key, favorites);
    },
  });
  return { ...query, toggle: mutation, authenticated: !!session };
}
