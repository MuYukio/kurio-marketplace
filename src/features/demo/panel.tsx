import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { post, authStorage } from '@/shared/api/client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/shared/ui/common';
import { useRealtime } from '@/shared/realtime/provider';
export function DemoPanel() {
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState('nft-1'),
    { connected } = useRealtime();
  const action = useMutation({
    mutationFn: ({ path, data }: { path: string; data?: unknown }) => post(path, data),
  });
  const send = (name: string) =>
    action.mutate({ path: '/demo/action', data: { action: name, nftId: target } });
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return null;
  return (
    <>
      <button className="demo-trigger" onClick={() => setOpen(true)}>
        <FlaskConical size={14} /> Cenários de demonstração{' '}
        <span className={connected ? 'connection-dot online' : 'connection-dot'} />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Laboratório da demonstração"
        description="Os controles alteram a simulação de rede, sem modificar diretamente o estado da interface."
      >
        <p className="tiny mb-4" role="status">
          Socket.IO: {connected ? 'conectado' : 'reconectando'}
        </p>
        <label className="field">
          Cenário
          <select
            aria-label="Cenário de rede"
            defaultValue="default"
            onChange={(e) =>
              action.mutate({ path: '/demo/scenario', data: { scenario: e.target.value } })
            }
          >
            <option value="default">Padrão</option>
            <option value="slow">Rede lenta</option>
            <option value="offline-once">Falha de conexão uma vez</option>
            <option value="server-error-once">Erro HTTP 503 uma vez</option>
            <option value="favorite-error">Favorito falha uma vez</option>
            <option value="out-of-order">Busca fora de ordem</option>
            <option value="declined">Pagamento recusado</option>
            <option value="timeout">Timeout após criar pedido</option>
          </select>
        </label>
        <label className="field">
          NFT alvo
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={`nft-${i + 1}`}>
                nft-{i + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => send('price')}>
            Alterar preço
          </Button>
          <Button variant="outline" size="sm" onClick={() => send('sold-out')}>
            Esgotar edição
          </Button>
          <Button variant="outline" size="sm" onClick={() => send('duplicate')}>
            Duplicar evento
          </Button>
          <Button variant="outline" size="sm" onClick={() => send('old-event')}>
            Evento antigo
          </Button>
          <Button variant="outline" size="sm" onClick={() => send('expire')}>
            Expirar sessão
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => action.mutate({ path: '/demo/disconnect' })}
          >
            Interromper socket
          </Button>
          <Button variant="outline" size="sm" onClick={() => send('resolve')}>
            Resolver pendentes
          </Button>
        </div>
        {action.isError && <ErrorState error={action.error} />}
        {action.isSuccess && (
          <p role="status" className="tiny success mt-3">
            Ação aplicada à simulação.
          </p>
        )}
        <hr className="my-6 border-border" />
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (
              window.confirm(
                'Restaurar todos os dados fictícios? Contas e pedidos criados nesta demo serão removidos.',
              )
            )
              action.mutate(
                { path: '/demo/reset' },
                {
                  onSuccess: () => {
                    authStorage.set('');
                    Object.keys(localStorage)
                      .filter((k) => k.startsWith('kurio.') && k !== 'kurio.mock.v1')
                      .forEach((k) => localStorage.removeItem(k));
                    sessionStorage.clear();
                    window.location.assign('/');
                  },
                },
              );
          }}
        >
          Resetar demonstração
        </Button>
      </Dialog>
    </>
  );
}
