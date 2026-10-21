import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Trash2, ArrowRight, ArrowLeft, Minus, Plus } from 'lucide-react';
import { useCart, useCartMutation } from './hooks';
import { errorMessage, get, post } from '@/shared/api/client';
import { eth } from '@/shared/money/eth';
import type { CartView, CatalogPage, Quote } from '@/shared/contracts';
import { Button } from '@/components/ui/button';
import { Skeleton, Empty, ErrorState } from '@/shared/ui/common';
import { Carousel } from '@/components/ui/carousel';
import { NftCard } from '../catalog/page';
import './cart.css';
export function QuoteSummary({ quote }: { quote: Quote }) {
  return (
    <dl className="summary-values">
      <div>
        <dt>Subtotal</dt>
        <dd>{eth(quote.subtotalEth)}</dd>
      </div>
      <div>
        <dt>Desconto do lançamento {quote.coupon && `(${quote.coupon})`}</dt>
        <dd>− {eth(quote.discountEth)}</dd>
      </div>
      <div>
        <dt>
          Taxa de rede <small>Taxa estimada</small>
        </dt>
        <dd>{eth(quote.networkFeeEth)}</dd>
      </div>
      <div className="summary-total">
        <dt>Total</dt>
        <dd>{eth(quote.totalEth)}</dd>
      </div>
    </dl>
  );
}
export function CartPage() {
  const cart = useCart(),
    mutation = useCartMutation(),
    [coupon, setCoupon] = useState(sessionStorage.getItem('kurio.coupon') || ''),
    [removed, setRemoved] = useState<CartView['lines'][number] | null>(null);
  const quote = useQuery({
    queryKey: [
      'quote',
      'cart',
      cart.data?.version,
      coupon,
      cart.data?.lines.map((l) => l.nft.version),
    ],
    queryFn: () => post<Quote>('/quotes', { coupon, network: 'Ethereum' }),
    enabled: !!cart.data?.items.length,
    retry: false,
    staleTime: 0,
  });
  const recommendations = useQuery({
    queryKey: ['nfts', 'cart-recommendations'],
    queryFn: ({ signal }) => get<CatalogPage>('/nfts', signal, { page: 1, sort: 'popular' }),
  });
  const apply = (value: string) => {
    setCoupon(value);
    sessionStorage.setItem('kurio.coupon', value);
  };
  const couponError = quote.isError && coupon ? errorMessage(quote.error) : '';
  const canCheckout =
    !!quote.data &&
    !quote.isFetching &&
    !quote.isError &&
    !!cart.data?.lines.length &&
    cart.data.lines.every((line) => line.quantity <= line.edition.available);
  const removeLine = (line: CartView['lines'][number]) => {
    mutation.mutate(
      { action: 'remove', id: line.id },
      {
        onSuccess: () => setRemoved(line),
      },
    );
  };
  const undoRemoval = () => {
    if (!removed) return;
    mutation.mutate(
      {
        action: 'add',
        nftId: removed.nftId,
        editionId: removed.editionId,
        quantity: removed.quantity,
      },
      { onSuccess: () => setRemoved(null) },
    );
  };
  const undoNotice = removed && (
    <div className="cart-undo" role="status">
      <span>{removed.nft.name} removido do carrinho.</span>
      <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={undoRemoval}>
        Desfazer
      </Button>
    </div>
  );
  return (
    <div className="cart-page page-space">
      <nav className="cart-breadcrumb" aria-label="Navegação estrutural">
        <Link to="/">Início</Link>
        <span>/</span>
        <a href="/#catalogo">Mercado</a>
        <span>/</span>
        <strong>Carrinho</strong>
      </nav>
      <header className="cart-mobile-heading">
        <Button asChild variant="ghost" size="icon">
          <Link to="/" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1>Carrinho de NFTs</h1>
      </header>
      {cart.isPending ? (
        <Skeleton />
      ) : cart.isError ? (
        <ErrorState error={cart.error} retry={() => void cart.refetch()} />
      ) : !cart.data.items.length ? (
        <>
          <Empty title="Seu carrinho está esperando uma descoberta">
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          </Empty>
          {undoNotice}
        </>
      ) : (
        <>
          <div className="checkout-layout cart-checkout-layout">
            <div className="cart-items-column">
              <div className="cart-table-heading" aria-hidden="true">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
              </div>
              {cart.data.lines.map((line) => (
                <article
                  key={line.id}
                  className={`cart-line panel ${line.nft.version > 1 ? 'cart-line-updated' : ''}`}
                >
                  <Link to="/mercado/$nftId" params={{ nftId: line.nftId }}>
                    <img src={line.nft.image} alt={line.nft.name} width="112" height="112" />
                  </Link>
                  <div className="cart-line-info">
                    <h2>{line.nft.name}</h2>
                    <span className="tiny muted">
                      {line.edition.name} · {line.nft.network}
                    </span>
                    <span className="cart-unit-price price">{eth(line.edition.priceEth)}</span>
                    <div className="cart-quantity" aria-label={`Quantidade de ${line.nft.name}`}>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Diminuir ${line.nft.name}`}
                        disabled={mutation.isPending || line.quantity <= 1}
                        onClick={() =>
                          mutation.mutate({
                            action: 'update',
                            id: line.id,
                            quantity: line.quantity - 1,
                          })
                        }
                      >
                        <Minus />
                      </Button>
                      <span>{line.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Aumentar ${line.nft.name}`}
                        disabled={mutation.isPending || line.quantity >= line.edition.available}
                        onClick={() =>
                          mutation.mutate({
                            action: 'update',
                            id: line.id,
                            quantity: line.quantity + 1,
                          })
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                    <strong className="cart-line-total price">
                      {quote.data?.lines.find(
                        (item) => item.nftId === line.nftId && item.editionId === line.editionId,
                      )?.lineTotalEth
                        ? eth(
                            quote.data.lines.find(
                              (item) =>
                                item.nftId === line.nftId && item.editionId === line.editionId,
                            )!.lineTotalEth,
                          )
                        : '—'}
                    </strong>
                    {line.nft.version > 1 && (
                      <span className="cart-change-note" role="status">
                        Preço ou disponibilidade atualizados
                      </span>
                    )}
                    {line.quantity > line.edition.available && (
                      <p className="field-error">
                        Disponibilidade alterada. Remova ou ajuste a quantidade.
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover ${line.nft.name}`}
                    disabled={mutation.isPending}
                    onClick={() => removeLine(line)}
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))}
              {undoNotice}
              {mutation.isError && <ErrorState error={mutation.error} />}
            </div>
            <aside className="panel order-summary">
              <h2>Resumo da carteira</h2>
              <form
                className="coupon-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  apply(
                    String(new FormData(e.currentTarget).get('coupon') || '')
                      .trim()
                      .toUpperCase(),
                  );
                }}
              >
                <label htmlFor="coupon">Cupom de desconto</label>
                <div className="flex gap-2">
                  <input
                    key={coupon}
                    id="coupon"
                    name="coupon"
                    defaultValue={coupon}
                    placeholder="Código do cupom"
                    aria-invalid={!!couponError}
                    aria-describedby={couponError ? 'coupon-error' : undefined}
                  />
                  <Button variant="outline" size="sm">
                    Aplicar
                  </Button>
                </div>
              </form>
              {couponError && (
                <p id="coupon-error" className="field-error" role="alert">
                  {couponError}
                </p>
              )}
              {coupon && (
                <button className="text-link tiny" onClick={() => apply('')}>
                  Remover cupom
                </button>
              )}
              {quote.isPending ? (
                <div className="skeleton h-40" />
              ) : quote.isError ? (
                couponError ? null : (
                  <ErrorState error={quote.error} retry={() => void quote.refetch()} />
                )
              ) : (
                <QuoteSummary quote={quote.data} />
              )}
              {canCheckout ? (
                <Button asChild className="w-full mt-5">
                  <Link to="/pagamento">
                    Conectar e finalizar <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button className="w-full mt-5" disabled aria-busy={quote.isFetching}>
                  {quote.isFetching ? 'Atualizando cotação…' : 'Conectar e finalizar'}
                </Button>
              )}
              <Link className="cart-continue" to="/">
                Continuar explorando
              </Link>
              <p className="tiny muted mt-4">
                Taxa estimada para Ethereum. A rede escolhida no pagamento pode alterar a cotação.
              </p>
            </aside>
          </div>
          {recommendations.data?.items.length ? (
            <section className="cart-recommendations" aria-labelledby="cart-recommendations-title">
              <h2 id="cart-recommendations-title">Colecionadores também viram</h2>
              <Carousel label="NFTs recomendados">
                {recommendations.data.items.slice(0, 8).map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </Carousel>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
