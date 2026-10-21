import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Clock3, MailOpen, X, XCircle } from 'lucide-react';
import { get } from '@/shared/api/client';
import { eth } from '@/shared/money/eth';
import type { Order } from '@/shared/contracts';
import { useAuth } from '../auth/session';
import { Button } from '@/components/ui/button';
import { Skeleton, ErrorState } from '@/shared/ui/common';

const shortReference = (value: string) =>
  value.length > 14 ? `${value.slice(0, 7).toUpperCase()}…${value.slice(-4).toUpperCase()}` : value;

const orderDate = (timestamp: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Cuiaba',
  })
    .format(new Date(timestamp))
    .replace('.', '');

function OrderStatus({ order }: { order: Order }) {
  if (order.status === 'confirmed') return null;
  const declined = order.status === 'declined';
  return (
    <section className={`receipt-status ${order.status}`} role="status" aria-live="polite">
      {declined ? <XCircle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
      <h1 id="receipt-title">{declined ? 'Pagamento recusado' : 'Pedido em processamento'}</h1>
      <p>
        {declined
          ? 'Seus itens foram preservados. Revise os dados e tente novamente.'
          : 'Aguarde a confirmação. Esta página pode ser atualizada sem criar outra compra.'}
      </p>
      <Button asChild>
        <Link to={declined ? '/cart' : '/'}>
          {declined ? 'Voltar ao carrinho' : 'Continuar explorando'}
        </Link>
      </Button>
    </section>
  );
}

export function OrderPage() {
  const { orderId } = useParams({ strict: false });
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ['user', session?.user.id, 'order', orderId],
    queryFn: ({ signal }) => get<Order>(`/orders/${orderId}`, signal),
    refetchInterval: (current) => (current.state.data?.status === 'pending' ? 2000 : false),
  });

  if (query.isPending)
    return (
      <div className="receipt-route">
        <div className="receipt-skeleton">
          <Skeleton cards={3} />
        </div>
      </div>
    );
  if (query.isError)
    return (
      <div className="receipt-route">
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </div>
    );

  const order = query.data;
  return (
    <div className="receipt-route">
      <div className="receipt-backdrop" aria-hidden="true" />
      <article className={`receipt-card ${order.status}`} aria-labelledby="receipt-title">
        <Link className="receipt-close" to="/" aria-label="Fechar confirmação">
          <X aria-hidden="true" />
        </Link>

        <OrderStatus order={order} />

        {order.status === 'confirmed' && (
          <>
            <header className="receipt-heading">
              <span className="receipt-envelope" aria-hidden="true">
                <MailOpen />
                <small>
                  THANK
                  <br />
                  YOU
                </small>
              </span>
              <h1 id="receipt-title">Seus NFTs agora estão na sua carteira</h1>
            </header>

            <dl className="receipt-meta">
              <div>
                <dt>ID da transação</dt>
                <dd
                  data-testid="order-id"
                  title={order.transaction || order.id}
                  aria-label={`Transação ${order.transaction || order.id}`}
                >
                  {shortReference(order.transaction || order.id)}
                </dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{orderDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{eth(order.quote.totalEth)}</dd>
              </div>
              <div>
                <dt>Carteira</dt>
                <dd>{order.provider === 'metamask' ? 'MetaMask' : order.wallet.name}</dd>
              </div>
            </dl>

            <section className="receipt-transaction" aria-labelledby="transaction-details">
              <h2 id="transaction-details">Detalhes da transação</h2>
              <div className="receipt-table-heading" aria-hidden="true">
                <span>NFTs</span>
                <span>Edições</span>
                <span>Subtotal</span>
              </div>
              <ul className="receipt-lines">
                {order.quote.lines.map((line) => (
                  <li key={`${line.nftId}:${line.editionId}`}>
                    <img src={line.image} alt="" width="64" height="64" />
                    <div className="receipt-line-name">
                      <strong>{line.name}</strong>
                      <small>ID do token: #{line.nftId.slice(-4).toUpperCase()}</small>
                    </div>
                    <span className="receipt-line-quantity">(x {line.quantity})</span>
                    <strong className="receipt-line-price">{eth(line.lineTotalEth)}</strong>
                  </li>
                ))}
              </ul>
              <dl className="receipt-totals">
                <div>
                  <dt>Taxa de rede</dt>
                  <dd>{eth(order.quote.networkFeeEth)}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{eth(order.quote.totalEth)}</dd>
                </div>
              </dl>
            </section>

            <footer className="receipt-footer">
              <p>
                Transação confirmada na {order.wallet.network}. A propriedade foi transferida para
                sua carteira conectada e registrada na rede.
              </p>
              <a
                className="receipt-explorer"
                href={`https://etherscan.io/tx/${order.transaction || order.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver no Etherscan
              </a>
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
