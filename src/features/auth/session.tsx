import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@/shared/contracts';
import { get, post, authStorage, rotateGuest } from '@/shared/api/client';
import { queryClient } from '@/app/query';
type Auth = {
  session: Session | null;
  loading: boolean;
  accept: (s: Session) => Promise<void>;
  logout: () => Promise<void>;
  notice: string;
  setNotice: (message: string) => void;
  epoch: number;
  error: unknown;
  retrySession: () => void;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0),
    [notice, setNotice] = useState(''),
    [transitioning, setTransitioning] = useState(false);
  const session = useQuery({
    queryKey: ['session', epoch],
    queryFn: ({ signal }) => get<Session>('/session', signal),
    enabled: !!authStorage.token(),
  });
  const clear = () => {
    authStorage.set('');
    void queryClient.cancelQueries();
    queryClient.clear();
    setEpoch((e) => e + 1);
  };
  useEffect(() => {
    const expire = () => {
      if (!authStorage.token()) return;
      clear();
      setNotice('Sua sessão expirou. Entre novamente para retomar.');
    };
    window.addEventListener('kurio:expired', expire);
    return () => window.removeEventListener('kurio:expired', expire);
  }, []);
  async function accept(s: Session) {
    setTransitioning(true);
    try {
      await queryClient.cancelQueries();
      authStorage.set(s.token);
      queryClient.clear();
      // Complete the guest merge before exposing the authenticated UI.
      const result = await post<{ messages?: string[] }>('/cart/merge');
      rotateGuest();
      const next = epoch + 1;
      queryClient.setQueryData(['session', next], s);
      setEpoch(next);
      if (result.messages?.length) setNotice(result.messages.join(' '));
    } finally {
      setTransitioning(false);
    }
  }
  async function logout() {
    try {
      await post('/auth/logout');
    } finally {
      clear();
      rotateGuest();
      setNotice('Você saiu da sua conta.');
    }
  }
  const value = {
    session: !transitioning && authStorage.token() ? (session.data ?? null) : null,
    loading: transitioning || (!!authStorage.token() && session.isPending),
    accept,
    logout,
    notice,
    setNotice,
    epoch,
    error: authStorage.token() ? session.error : null,
    retrySession: () => void session.refetch(),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
// This hook is kept with its provider to keep the session contract in one place.
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider ausente');
  return value;
}
