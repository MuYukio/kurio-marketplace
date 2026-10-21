import { useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, MoreVertical, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../auth/session';
import { useCart } from '../cart/hooks';
import { errorCode, fieldErrors, get, post } from '@/shared/api/client';
import {
  collectorSchema,
  networks,
  type Collector,
  type Network,
  type Order,
  type Quote,
  type Wallet,
  type WalletProvider,
} from '@/shared/contracts';
import { eth } from '@/shared/money/eth';
import { useRealtime } from '@/shared/realtime/provider';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, Field, Skeleton } from '@/shared/ui/common';
import { QuoteSummary } from '../cart/page';

type Attempt = {
  quoteId: string;
  walletId: string;
  collector: Collector;
  provider: WalletProvider;
  idempotencyKey: string;
};
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'declined';
type Draft = Partial<Collector> & {
  walletId?: string;
  provider?: WalletProvider;
  network?: Network;
};

const providerOptions: Array<{ id: WalletProvider; badge: string; label: string }> = [
  { id: 'walletconnect', badge: 'W', label: 'WalletConnect' },
  { id: 'metamask', badge: 'M', label: 'MetaMask' },
  { id: 'coinbase', badge: 'C', label: 'Coinbase Wallet' },
];

function compactAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 7)}…${address.slice(-4)}` : address;
}

function quoteFingerprint(quote: Quote) {
  return JSON.stringify({
    lines: quote.lines,
    coupon: quote.coupon,
    network: quote.network,
    subtotal: quote.subtotalEth,
    discount: quote.discountEth,
    fee: quote.networkFeeEth,
    total: quote.totalEth,
  });
}

function collectorFrom(form: HTMLFormElement): Collector {
  const values = new FormData(form);
  return {
    displayName: String(values.get('displayName') || ''),
    username: String(values.get('username') || ''),
    profileName: String(values.get('profileName') || ''),
    email: String(values.get('email') || ''),
    ensName: String(values.get('ensName') || ''),
    referralCode: String(values.get('referralCode') || ''),
    walletAddress: String(values.get('walletAddress') || ''),
    walletType: String(values.get('walletType') || 'primary') as Collector['walletType'],
    secondaryWallet: String(values.get('secondaryWallet') || ''),
    note: String(values.get('note') || ''),
  };
}

function ProviderPicker({
  provider,
  onChange,
}: {
  provider: WalletProvider;
  onChange: (provider: WalletProvider) => void;
}) {
  return (
    <fieldset className="provider-picker">
      <legend>Carteira e rede</legend>
      <div className="provider-options" role="radiogroup" aria-label="Provedor da carteira">
        {providerOptions.map((option) => (
          <label key={option.id} className={provider === option.id ? 'selected' : ''}>
            <input
              type="radio"
              name="provider"
              value={option.id}
              checked={provider === option.id}
              onChange={() => onChange(option.id)}
            />
            <span className="provider-badge" aria-hidden="true">
              {option.badge}
            </span>
            <span>{option.label}</span>
            <span className="radio-mark" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function WalletCards({
  wallets,
  selected,
  onChange,
}: {
  wallets: Wallet[];
  selected: string;
  onChange: (wallet: Wallet) => void;
}) {
  return (
    <fieldset className="mobile-wallets">
      <div className="mobile-section-heading">
        <legend>Carteira conectada</legend>
        <Link to="/wallets">Trocar carteira</Link>
      </div>
      <div role="radiogroup" aria-label="Carteira cadastrada">
        {wallets.map((wallet) => (
          <label key={wallet.id} className={selected === wallet.id ? 'selected' : ''}>
            <input
              type="radio"
              name="mobileWallet"
              checked={selected === wallet.id}
              onChange={() => onChange(wallet)}
            />
            <span className="radio-mark" aria-hidden="true" />
            <span>
              <strong>{wallet.role === 'primary' ? 'Principal' : 'Reserva'}</strong>
              <small>{compactAddress(wallet.address)}</small>
              <small>Rede {wallet.network}</small>
            </span>
            <MoreVertical size={16} aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckoutPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const cart = useCart();
  const { revision } = useRealtime();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const attemptKey = `kurio.attempt.${uid}`;
  const draftKey = `kurio.checkout.${uid}`;
  const [draft] = useState<Draft>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || '{}');
    } catch {
      return {};
    }
  });
  const [walletId, setWalletId] = useState(draft.walletId || '');
  const [network, setNetwork] = useState<Network>(draft.network || 'Ethereum');
  const [provider, setProvider] = useState<WalletProvider>(draft.provider || 'coinbase');
  const [connection, setConnection] = useState<ConnectionState>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [useAnotherWallet, setUseAnotherWallet] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewChecked, setReviewChecked] = useState(false);
  const [collector, setCollector] = useState<Collector | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [quoteNotice, setQuoteNotice] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [coupon, setCoupon] = useState(sessionStorage.getItem('kurio.coupon') || '');
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(attemptKey) || 'null');
    } catch {
      return null;
    }
  });

  const wallets = useQuery({
    queryKey: ['user', uid, 'wallets'],
    queryFn: ({ signal }) => get<Wallet[]>('/wallets', signal),
  });
  const selectedWallet = wallets.data?.find(
    (wallet) =>
      wallet.id === (walletId || wallets.data.find((item) => item.role === 'primary')?.id),
  );

  const quote = useQuery({
    queryKey: [
      'quote',
      'checkout',
      uid,
      cart.data?.version,
      selectedWallet?.id,
      network,
      coupon,
      revision,
    ],
    queryFn: () => post<Quote>('/quotes', { coupon, network }),
    enabled: !!selectedWallet && selectedWallet.network === network && !!cart.data?.items.length,
    retry: false,
    staleTime: 0,
  });

  const purchase = useMutation({
    mutationFn: (input: Attempt) => post<Order>('/orders', input, input.idempotencyKey),
    onSuccess: async (order) => {
      localStorage.removeItem(attemptKey);
      sessionStorage.removeItem(draftKey);
      sessionStorage.setItem(`kurio.lastOrder.${uid}`, order.id);
      submittingRef.current = false;
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } });
    },
    onError: (error) => {
      submittingRef.current = false;
      if (
        ['QUOTE_STALE', 'STOCK_CONFLICT', 'WALLET_INVALID', 'VALIDATION'].includes(
          errorCode(error) || '',
        )
      ) {
        localStorage.removeItem(attemptKey);
        setAttempt(null);
        setReviewChecked(false);
        setReviewOpen(false);
        setQuoteNotice('Os dados ou valores mudaram. Revise a nova cotação antes de continuar.');
        void quote.refetch();
      }
    },
  });
  const errors = { ...clientErrors, ...fieldErrors(purchase.error) };

  function chooseWallet(wallet: Wallet) {
    setWalletId(wallet.id);
    setNetwork(wallet.network);
    setConnection('disconnected');
    setConnectionMessage('');
    setReviewChecked(false);
  }

  function changeNetwork(value: Network) {
    setNetwork(value);
    const compatible = wallets.data?.find((wallet) => wallet.network === value);
    setWalletId(compatible?.id || '');
    setConnection('disconnected');
    setConnectionMessage('');
    setReviewChecked(false);
  }

  function connect() {
    if (!selectedWallet) return;
    setConnection('connecting');
    setConnectionMessage(
      `Conectando com ${providerOptions.find((item) => item.id === provider)?.label}…`,
    );
    window.setTimeout(() => {
      setConnection('connected');
      setConnectionMessage('Carteira conectada na simulação.');
    }, 350);
  }

  function validateCollector() {
    if (!formRef.current) return null;
    const value = collectorFrom(formRef.current);
    const result = collectorSchema.safeParse(value);
    if (result.success) {
      setClientErrors({});
      return result.data;
    }
    const nextErrors: Record<string, string> = {};
    for (const issue of result.error.issues) nextErrors[String(issue.path[0])] = issue.message;
    setClientErrors(nextErrors);
    window.setTimeout(() => errorSummaryRef.current?.focus());
    return null;
  }

  function openReview() {
    const value = validateCollector();
    if (!value || !quote.data || !selectedWallet || connection !== 'connected') return;
    setCollector(value);
    setReviewChecked(false);
    setReviewOpen(true);
  }

  async function sendOrder() {
    if (submittingRef.current || !collector || !selectedWallet || !quote.data || !reviewChecked)
      return;
    submittingRef.current = true;
    const previous = quote.data;
    const refreshed = await quote.refetch();
    if (!refreshed.data) {
      submittingRef.current = false;
      return;
    }
    if (quoteFingerprint(previous) !== quoteFingerprint(refreshed.data)) {
      submittingRef.current = false;
      setReviewOpen(false);
      setReviewChecked(false);
      setQuoteNotice('A cotação foi atualizada. Confira os novos valores e confirme novamente.');
      return;
    }
    const value: Attempt = {
      quoteId: refreshed.data.id,
      walletId: selectedWallet.id,
      collector,
      provider,
      idempotencyKey: crypto.randomUUID(),
    };
    localStorage.setItem(attemptKey, JSON.stringify(value));
    setAttempt(value);
    purchase.mutate(value);
  }

  const defaultUsername = session!.user.email.split('@')[0];
  const defaultEns = `${defaultUsername.replace(/[^a-z0-9-]/gi, '').toLowerCase()}.kurio.eth`;
  const serverError = purchase.isError && !Object.keys(fieldErrors(purchase.error)).length;

  return (
    <div className="checkout-page page-space">
      <nav className="checkout-breadcrumb" aria-label="Navegação estrutural">
        <Link to="/">Início</Link> / <Link to="/">Mercado</Link> / <span>Pagamento</span>
      </nav>
      <div className="checkout-mobile-title">
        <button
          type="button"
          aria-label="Voltar ao carrinho"
          onClick={() => void navigate({ to: '/cart' })}
        >
          <ArrowLeft />
        </button>
        <h1>Pagamento com carteira</h1>
      </div>

      {attempt && (
        <div className="panel checkout-attempt">
          <h2>Uma tentativa está em andamento</h2>
          <p>Recupere a mesma tentativa para não criar outra compra.</p>
          <Button disabled={purchase.isPending} onClick={() => purchase.mutate(attempt)}>
            {purchase.isPending ? 'Verificando pedido…' : 'Recuperar tentativa'}
          </Button>
          {purchase.isError && <ErrorState error={purchase.error} />}
        </div>
      )}

      {cart.isPending || wallets.isPending ? (
        <div className="checkout-skeleton">
          <Skeleton />
          <Skeleton />
        </div>
      ) : cart.isError || wallets.isError ? (
        <ErrorState
          error={cart.error || wallets.error}
          retry={() => void (cart.refetch(), wallets.refetch())}
        />
      ) : !cart.data.items.length ? (
        <div className="panel checkout-empty">
          <p>Seu carrinho está vazio.</p>
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </div>
      ) : wallets.data.length === 0 ? (
        <div className="panel checkout-empty">
          <p>Cadastre uma carteira para continuar.</p>
          <Button asChild>
            <Link to="/wallets">Minhas carteiras</Link>
          </Button>
        </div>
      ) : (
        <form
          ref={formRef}
          noValidate
          className="payment-layout"
          onChange={(event) => {
            const form = event.currentTarget;
            window.setTimeout(() => {
              const value = collectorFrom(form);
              sessionStorage.setItem(
                draftKey,
                JSON.stringify({
                  ...value,
                  walletId: selectedWallet?.id,
                  provider,
                  network,
                }),
              );
            });
          }}
          onSubmit={(event) => {
            event.preventDefault();
            openReview();
          }}
        >
          <section className="collector-column" key={selectedWallet?.id || 'wallet'}>
            <h1>Perfil do colecionador</h1>
            {!!Object.keys(errors).length && (
              <div
                ref={errorSummaryRef}
                tabIndex={-1}
                role="alert"
                className="checkout-error-summary"
              >
                <strong>Revise os campos destacados.</strong>
                <span>
                  Encontramos {Object.keys(errors).length} campo(s) que precisam de atenção.
                </span>
              </div>
            )}
            <div className="collector-grid">
              <Field
                id="displayName"
                name="displayName"
                label="Nome de exibição *"
                defaultValue={draft.displayName || session!.user.name}
                required
                error={errors.displayName}
              />
              <Field
                id="username"
                name="username"
                label="Nome de usuário *"
                defaultValue={draft.username || defaultUsername}
                required
                error={errors.username}
              />
              <label className="field">
                Rede *
                <select
                  name="network"
                  value={network}
                  onChange={(event) => changeNetwork(event.target.value as Network)}
                >
                  {networks.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <Field
                id="profileName"
                name="profileName"
                label="Nome do perfil *"
                defaultValue={draft.profileName || session!.user.name}
                required
                error={errors.profileName}
              />
              <Field
                id="walletAddress"
                name="walletAddress"
                label="Endereço da carteira *"
                defaultValue={draft.walletAddress || selectedWallet?.address}
                readOnly={!useAnotherWallet}
                required
                error={errors.walletAddress}
              />
              <Field
                id="secondaryWallet"
                name="secondaryWallet"
                label="ENS ou carteira secundária (opcional)"
                defaultValue={draft.secondaryWallet || ''}
                error={errors.secondaryWallet}
              />
              <label className="field">
                Tipo de carteira *
                <select
                  name="walletType"
                  defaultValue={draft.walletType || selectedWallet?.role || 'primary'}
                >
                  <option value="primary">Principal</option>
                  <option value="secondary">Secundária</option>
                  <option value="other">Outra</option>
                </select>
              </label>
              <Field
                id="referralCode"
                name="referralCode"
                label="Código de indicação *"
                defaultValue={draft.referralCode || 'KURIO26'}
                required
                error={errors.referralCode}
              />
              <Field
                id="email"
                name="email"
                label="E-mail *"
                type="email"
                defaultValue={draft.email || session!.user.email}
                required
                error={errors.email}
              />
              <Field
                id="ensName"
                name="ensName"
                label="Nome ENS *"
                defaultValue={draft.ensName || defaultEns}
                required
                error={errors.ensName}
              />
            </div>
            <label className="another-wallet">
              <input
                type="checkbox"
                checked={useAnotherWallet}
                onChange={(event) => setUseAnotherWallet(event.target.checked)}
              />
              <span className="radio-mark" aria-hidden="true" /> Usar outra carteira?
            </label>
            <label className="field checkout-note">
              Observação do colecionador (opcional)
              <textarea
                name="note"
                rows={5}
                defaultValue={draft.note || ''}
                maxLength={500}
                aria-invalid={!!errors.note}
                aria-describedby={errors.note ? 'note-error' : undefined}
              />
              {errors.note && (
                <span id="note-error" className="field-error">
                  {errors.note}
                </span>
              )}
            </label>
          </section>

          <aside className="payment-summary">
            <WalletCards
              wallets={wallets.data}
              selected={selectedWallet?.id || ''}
              onChange={chooseWallet}
            />
            <section className="checkout-nfts">
              <div className="checkout-nfts-heading">
                <h2>Seus NFTs</h2>
                <span>Subtotal</span>
              </div>
              {quote.isPending ? (
                <div className="skeleton h-40" />
              ) : quote.isError ? (
                <ErrorState error={quote.error} retry={() => void quote.refetch()} />
              ) : (
                quote.data && (
                  <ul>
                    {quote.data.lines.map((line) => (
                      <li key={`${line.nftId}:${line.editionId}`}>
                        <img src={line.image} alt="" width="56" height="56" />
                        <span>
                          <strong>{line.name}</strong>
                          <small>ID do token: {line.tokenId}</small>
                        </span>
                        <small>(x {line.quantity})</small>
                        <strong>{eth(line.lineTotalEth)}</strong>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>

            <section className="checkout-quote">
              {!showCoupon ? (
                <button
                  type="button"
                  className="checkout-coupon-link"
                  onClick={() => setShowCoupon(true)}
                >
                  Tem um código promocional? Aplique aqui
                </button>
              ) : (
                <div className="checkout-coupon">
                  <label htmlFor="checkout-coupon">Código promocional</label>
                  <div>
                    <input
                      id="checkout-coupon"
                      defaultValue={coupon}
                      placeholder="Código do cupom"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        const input = event.currentTarget.parentElement?.querySelector('input');
                        const value = input?.value.trim().toUpperCase() || '';
                        sessionStorage.setItem('kurio.coupon', value);
                        setCoupon(value);
                        setReviewChecked(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
              {quote.data && <QuoteSummary quote={quote.data} />}
              <p className="network-fee-caption">Taxa estimada para {network}</p>
              {quoteNotice && (
                <p role="status" className="checkout-quote-notice">
                  {quoteNotice}
                </p>
              )}
            </section>

            {quote.data && (
              <details className="mobile-order-details">
                <summary>Ver detalhes do pedido</summary>
                <ul>
                  {quote.data.lines.map((line) => (
                    <li key={`${line.nftId}:${line.editionId}`}>
                      <span>
                        {line.quantity} × {line.name}
                      </span>
                      <strong>{eth(line.lineTotalEth)}</strong>
                    </li>
                  ))}
                </ul>
                <QuoteSummary quote={quote.data} />
              </details>
            )}

            <ProviderPicker
              provider={provider}
              onChange={(value) => {
                setProvider(value);
                setConnection('disconnected');
                setConnectionMessage('');
                setReviewChecked(false);
              }}
            />
            <div className="provider-actions">
              <Button
                type="button"
                variant="outline"
                disabled={connection === 'connecting'}
                onClick={() => {
                  if (connection === 'connected') {
                    setConnection('disconnected');
                    setConnectionMessage('Carteira desconectada.');
                  } else connect();
                }}
              >
                {connection === 'connected' ? <Check /> : <WalletIcon />}
                {connection === 'connecting'
                  ? 'Conectando…'
                  : connection === 'connected'
                    ? 'Desconectar carteira'
                    : 'Conectar carteira'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setConnection('declined');
                  setConnectionMessage('Conexão recusada. Você pode tentar novamente.');
                }}
              >
                Simular recusa
              </button>
            </div>
            <p
              role="status"
              className={
                connection === 'declined' ? 'connection-status error' : 'connection-status'
              }
            >
              {connectionMessage || 'Conecte a carteira para confirmar.'}
            </p>
            {serverError && <ErrorState error={purchase.error} />}

            <div className="mobile-total" aria-live="polite">
              <span>Total:</span>
              <strong>{quote.data ? eth(quote.data.totalEth) : '—'}</strong>
            </div>
            <Button
              className="checkout-confirm"
              disabled={
                !quote.data ||
                !selectedWallet ||
                connection !== 'connected' ||
                purchase.isPending ||
                !!attempt
              }
            >
              Confirmar compra
            </Button>
          </aside>
        </form>
      )}

      <Dialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Revise sua compra"
        description="Confira os itens, a carteira e o total antes de enviar o pedido."
      >
        {quote.data && selectedWallet && (
          <div className="checkout-review-dialog">
            <ul>
              {quote.data.lines.map((line) => (
                <li key={`${line.nftId}:${line.editionId}`}>
                  <span>
                    {line.quantity} × {line.name}
                  </span>
                  <strong>{eth(line.lineTotalEth)}</strong>
                </li>
              ))}
            </ul>
            <QuoteSummary quote={quote.data} />
            <dl>
              <div>
                <dt>Carteira</dt>
                <dd>{selectedWallet.name}</dd>
              </div>
              <div>
                <dt>Rede</dt>
                <dd>{network}</dd>
              </div>
              <div>
                <dt>Provedor</dt>
                <dd>{providerOptions.find((item) => item.id === provider)?.label}</dd>
              </div>
            </dl>
            <label className="review-check">
              <input
                type="checkbox"
                checked={reviewChecked}
                onChange={(event) => setReviewChecked(event.target.checked)}
              />
              Revisei os itens, a rede e o total desta cotação.
            </label>
            {purchase.isError && <ErrorState error={purchase.error} />}
            <Button
              className="w-full"
              disabled={!reviewChecked || purchase.isPending}
              onClick={() => void sendOrder()}
            >
              {purchase.isPending ? 'Enviando pedido…' : 'Enviar pedido'}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
