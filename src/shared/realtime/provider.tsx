import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/session';
import { queryClient } from '@/app/query';
import { authStorage } from '../api/client';
import type { EventData } from '../contracts';
const Context = createContext({ connected: false, revision: 0 });
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session, epoch, setNotice } = useAuth();
  const [connected, setConnected] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const seen = new Set<string>(),
      versions = new Map<string, number>();
    const reconcile = async () => {
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      if (active)
        await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    };
    let socket: Socket | undefined;
    const receive = (name: string, event: EventData) => {
      if (!active || !event.eventId || !Number.isInteger(event.version) || seen.has(event.eventId))
        return;
      if (name === 'order.updated' && event.userId !== session?.user.id) return;
      const key = `${name}:${event.resourceId}`;
      if ((versions.get(key) ?? -1) >= event.version) return;
      seen.add(event.eventId);
      versions.set(key, event.version);
      if (seen.size > 500) seen.clear();
      setRevision((v) => v + 1);
      if (name === 'nft.updated')
        setNotice('Preço ou disponibilidade atualizados. Revise o carrinho antes de comprar.');
      void reconcile();
    };
    // O socket.io-client guarda a referência do WebSocket global quando o módulo é avaliado.
    // Por isso ele é importado aqui, depois que o MSW já interceptou o WebSocket, e não no
    // carregamento inicial do app (que agora acontece em paralelo ao início do MSW).
    void import('socket.io-client').then(({ io }) => {
      if (!active) return;
      const current = io('https://kurio.mock', {
        transports: ['websocket'],
        reconnectionDelay: 500,
        reconnectionDelayMax: 1500,
      });
      socket = current;
      current.on('connect', () => current.emit('authenticate', authStorage.token()));
      current.on('ready', () => {
        if (!active) return;
        setConnected(true);
        void reconcile();
      });
      current.on('disconnect', () => {
        if (active) setConnected(false);
      });
      current.on('nft.updated', (e) => receive('nft.updated', e));
      current.on('order.updated', (e) => receive('order.updated', e));
    });
    return () => {
      active = false;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [session?.user.id, epoch, setNotice]);
  return <Context.Provider value={{ connected, revision }}>{children}</Context.Provider>;
}
export function useRealtime() {
  return useContext(Context);
}
