import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/session';
import { get, post, patch, http, guestId, authStorage } from '@/shared/api/client';
import type { CartView } from '@/shared/contracts';
export function useCart() {
  const { session, loading } = useAuth();
  const owner = session?.user.id || `guest:${guestId()}`;
  return useQuery({
    queryKey: ['cart', owner],
    queryFn: ({ signal }) => get<CartView>('/cart', signal),
    enabled: !loading,
  });
}
export function useCartMutation() {
  const client = useQueryClient(),
    epoch = authStorage.generation();
  return useMutation({
    mutationFn: async (input: {
      action: 'add' | 'update' | 'remove';
      id?: string;
      nftId?: string;
      editionId?: string;
      quantity?: number;
    }) =>
      input.action === 'add'
        ? post<CartView>('/cart/items', {
            nftId: input.nftId,
            editionId: input.editionId,
            quantity: input.quantity,
          })
        : input.action === 'update'
          ? patch<CartView>(`/cart/items/${input.id}`, { quantity: input.quantity })
          : (await http.delete<CartView>(`/cart/items/${input.id}`)).data,
    onSuccess: () => {
      if (authStorage.generation() === epoch) void client.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
