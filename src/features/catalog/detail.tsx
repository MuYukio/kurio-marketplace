import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Heart,
  LinkIcon,
  Mail,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Send,
} from 'lucide-react';
import { get } from '@/shared/api/client';
import type { CatalogPage, NFT } from '@/shared/contracts';
import { eth } from '@/shared/money/eth';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Empty, ErrorState, Skeleton } from '@/shared/ui/common';
import { useCartMutation } from '../cart/hooks';
import { useFavorites } from '../favorites/hooks';

type QuantityProps = {
  value: number;
  maximum: number;
  onChange: (value: number) => void;
  compact?: boolean;
};

function QuantityStepper({ value, maximum, onChange, compact = false }: QuantityProps) {
  const set = (next: number) => onChange(Math.min(Math.max(1, next), Math.max(1, maximum)));
  return (
    <div className={compact ? 'quantity-stepper compact' : 'quantity-stepper'}>
      {compact && <span>Qtd.</span>}
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={value <= 1}
        onClick={() => set(value - 1)}
      >
        <Minus />
      </button>
      <input
        aria-label="Quantidade"
        inputMode="numeric"
        value={value}
        onChange={(event) => set(Number.parseInt(event.target.value || '1', 10))}
      />
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= maximum || maximum === 0}
        onClick={() => set(value + 1)}
      >
        <Plus />
      </button>
      <span className="sr-only" aria-live="polite">
        Quantidade {value}. Máximo disponível: {maximum}.
      </span>
    </div>
  );
}

export function DetailPage() {
  const { nftId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [editionId, setEditionId] = useState('standard');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [tab, setTab] = useState<'details' | 'reviews'>('details');
  const [relatedPage, setRelatedPage] = useState(1);
  const query = useQuery({
    queryKey: ['nft', nftId],
    queryFn: ({ signal }) => get<NFT>(`/nfts/${nftId}`, signal),
  });
  const related = useQuery({
    queryKey: ['nfts-related', nftId, relatedPage],
    queryFn: ({ signal }) =>
      get<CatalogPage>('/nfts', signal, {
        sort: 'recent',
        page: relatedPage,
      }),
    enabled: !!query.data,
  });
  const add = useCartMutation();
  const fav = useFavorites();

  const relatedItems = useMemo(
    () => related.data?.items.filter((item) => item.id !== nftId).slice(0, 5) || [],
    [nftId, related.data],
  );

  if (query.isPending)
    return (
      <div className="detail-page detail-loading">
        <Skeleton />
      </div>
    );
  if (query.isError) {
    const notFound = (query.error as { response?: { status?: number } }).response?.status === 404;
    return notFound ? (
      <Empty title="NFT não encontrado">
        <p>Esta obra não existe ou não está mais disponível.</p>
        <Button asChild>
          <Link to="/">Voltar ao mercado</Link>
        </Button>
      </Empty>
    ) : (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  }

  const nft = query.data;
  const edition = nft.editions.find((item) => item.id === editionId) || nft.editions[0];
  const liked = fav.data?.includes(nft.id) || false;
  const currentImage = nft.images[imageIndex] || nft.images[0];
  const canBuy = edition.available > 0 && quantity >= 1 && quantity <= edition.available;
  const returnTo = `/mercado/${nft.id}`;
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;

  const toggleFavorite = () =>
    fav.authenticated
      ? fav.toggle.mutate({ id: nft.id, remove: liked })
      : void navigate({ to: '/login', search: { returnTo } });

  const addToCart = (goToCart: boolean) => {
    if (!canBuy || add.isPending) return;
    add.mutate(
      { action: 'add', nftId: nft.id, editionId: edition.id, quantity },
      { onSuccess: () => goToCart && void navigate({ to: '/cart' }) },
    );
  };

  return (
    <article className="detail-page">
      <div className="detail-desktop">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Início</Link> <span>/</span> <a href="/#catalogo">Mercado</a>
        </nav>
        <div className="detail-layout">
          <section className="detail-gallery" aria-label="Galeria de imagens">
            <div className="detail-thumbnails">
              {nft.images.map((image, index) => (
                <button
                  key={`${image.src}:${index}`}
                  type="button"
                  aria-label={`Ver imagem ${index + 1}`}
                  aria-pressed={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                >
                  <img src={image.src} alt="" width="96" height="96" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="detail-main-image">
              <img
                src={currentImage.src}
                alt={currentImage.alt}
                width="640"
                height="640"
                fetchPriority="high"
              />
              <button
                type="button"
                className="detail-zoom"
                aria-label="Ampliar imagem"
                onClick={() => setZoomOpen(true)}
              >
                <Search />
              </button>
            </div>
          </section>

          <section className="detail-info">
            <h1>{nft.name}</h1>
            <div className="detail-price-rating">
              <strong>{eth(edition.priceEth)}</strong>
              <span aria-label={`${nft.rating.average} de 5, ${nft.rating.count} avaliações`}>
                <span className="rating-stars" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} fill="currentColor" />
                  ))}
                </span>
                {nft.rating.count} avaliações de colecionadores
              </span>
            </div>
            <div className="detail-rule" />
            <h2>Sobre este NFT:</h2>
            <p className="detail-description">{nft.description}</p>
            <h2>Edição:</h2>
            <div className="edition-options" role="radiogroup" aria-label="Edição">
              {[...nft.editions].reverse().map((item) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={item.id === edition.id}
                  disabled={item.available === 0}
                  key={item.id}
                  onClick={() => {
                    setEditionId(item.id);
                    setQuantity(1);
                  }}
                >
                  {item.name}
                  {item.available === 0 && <span> Esgotada</span>}
                </button>
              ))}
              <span className="edition-status">ABERTA</span>
            </div>
            <div className="detail-purchase-row">
              <QuantityStepper
                value={quantity}
                maximum={edition.available}
                onChange={setQuantity}
              />
              <Button disabled={!canBuy || add.isPending} onClick={() => addToCart(true)}>
                {add.isPending ? 'ADICIONANDO…' : edition.available ? 'COMPRAR' : 'ESGOTADA'}
              </Button>
              <Button
                variant="outline"
                aria-label={liked ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={liked}
                disabled={fav.toggle.isPending}
                onClick={toggleFavorite}
              >
                <Heart fill={liked ? 'currentColor' : 'none'} />
                {liked ? 'Favoritado' : 'Favoritar'}
              </Button>
            </div>
            <dl className="detail-metadata">
              <div>
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div>
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div>
                <dt>Atributos:</dt>
                <dd>{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
            <div className="detail-share">
              <span>Compartilhar este NFT:</span>
              <a
                aria-label="Compartilhar por e-mail"
                href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`}
              >
                <Mail />
              </a>
              <a
                aria-label="Compartilhar no LinkedIn"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkIcon />
              </a>
              <a
                aria-label="Compartilhar no X"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send />
              </a>
            </div>
            {add.isError && <ErrorState error={add.error} />}
            {fav.toggle.isError && <ErrorState error={fav.toggle.error} />}
          </section>
        </div>

        <section className="detail-tabs">
          <div role="tablist" aria-label="Informações do NFT">
            <button
              role="tab"
              aria-selected={tab === 'details'}
              aria-controls="detail-tab-panel"
              onClick={() => setTab('details')}
            >
              Detalhes do NFT
            </button>
            <button
              role="tab"
              aria-selected={tab === 'reviews'}
              aria-controls="detail-tab-panel"
              onClick={() => setTab('reviews')}
            >
              Avaliações de colecionadores ({nft.rating.count})
            </button>
          </div>
          <div id="detail-tab-panel" role="tabpanel">
            {tab === 'details' ? (
              <>
                <p>
                  {nft.name} é uma obra digital {edition.name} finalizada à mão da coleção Kurio
                  Editions. Cada atributo fica armazenado nos metadados do token e verificado na
                  Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem
                  fronteiras.
                </p>
                <p>
                  A propriedade inclui a arte em alta resolução, lançamentos exclusivos para
                  colecionadores e um registro permanente de procedência na rede.
                </p>
                <dl>
                  <div>
                    <dt>Rede:</dt>
                    <dd>Cunhado na {nft.network} com procedência imutável e metadados em IPFS.</dd>
                  </div>
                  <div>
                    <dt>Contrato:</dt>
                    <dd>{nft.details.contract}</dd>
                  </div>
                  <div>
                    <dt>Direitos autorais:</dt>
                    <dd>{nft.details.royalties}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <ul className="detail-reviews">
                {nft.reviews.map((review) => (
                  <li key={review.id}>
                    <strong>{review.author}</strong>
                    <span>{review.rating} de 5</span>
                    <p>{review.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="related-section">
          <h2>Mais desta coleção</h2>
          {related.isPending ? (
            <Skeleton cards={5} />
          ) : related.isError ? (
            <ErrorState error={related.error} retry={() => void related.refetch()} />
          ) : (
            <>
              <div className="related-grid">
                {relatedItems.map((item) => (
                  <Link key={item.id} to="/mercado/$nftId" params={{ nftId: item.id }}>
                    <img src={item.image} alt={item.name} width="240" height="240" loading="lazy" />
                    <span>{item.name}</span>
                    <strong>{eth(item.editions[0].priceEth)}</strong>
                  </Link>
                ))}
              </div>
              <div className="related-pagination" aria-label="Páginas de obras relacionadas">
                {[1, 2, 3].map((page) => (
                  <button
                    type="button"
                    key={page}
                    aria-label={`Página relacionada ${page}`}
                    aria-current={relatedPage === page ? 'page' : undefined}
                    onClick={() => setRelatedPage(page)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="detail-mobile">
        <section className="mobile-artwork">
          <img
            src={currentImage.src}
            srcSet={
              currentImage.src === '/assets/nft-emerald-ape-042.webp'
                ? '/assets/nft-emerald-ape-042-480.webp 480w, /assets/nft-emerald-ape-042.webp 900w'
                : undefined
            }
            sizes="(max-width: 700px) 352px, 640px"
            alt={currentImage.alt}
            width="640"
            height="640"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <button
            type="button"
            className="mobile-back"
            aria-label="Voltar"
            onClick={() =>
              window.history.length > 1 ? window.history.back() : void navigate({ to: '/' })
            }
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            className="mobile-favorite"
            aria-label={liked ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-pressed={liked}
            onClick={toggleFavorite}
          >
            <Heart fill={liked ? 'currentColor' : 'none'} />
          </button>
        </section>
        <section className="mobile-detail-sheet">
          <div className="mobile-title-row">
            <h1>{nft.name}</h1>
            <span aria-label={`${nft.rating.average} de 5, ${nft.rating.count} avaliações`}>
              <Star fill="currentColor" /> {nft.rating.average} ({nft.rating.count})
            </span>
          </div>
          <p>{nft.shortDescription}</p>
          <h2>Edição:</h2>
          <div className="edition-options" role="radiogroup" aria-label="Edição">
            {[...nft.editions].reverse().map((item) => (
              <button
                type="button"
                role="radio"
                aria-checked={item.id === edition.id}
                disabled={item.available === 0}
                key={item.id}
                onClick={() => {
                  setEditionId(item.id);
                  setQuantity(1);
                }}
              >
                {item.name}
              </button>
            ))}
            <span className="edition-status">ABERTA</span>
          </div>
          <dl className="detail-metadata">
            <div>
              <dt>ID do token:</dt>
              <dd>{nft.tokenId}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div>
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          {add.isSuccess && (
            <p role="status" className="success">
              Obra adicionada ao carrinho.
            </p>
          )}
          {add.isError && <ErrorState error={add.error} />}
          {fav.toggle.isError && <ErrorState error={fav.toggle.error} />}
        </section>
        <div className="mobile-purchase-bar">
          <QuantityStepper
            compact
            value={quantity}
            maximum={edition.available}
            onChange={setQuantity}
          />
          <strong>{eth(edition.priceEth)}</strong>
          <Button disabled={!canBuy || add.isPending} onClick={() => addToCart(true)}>
            Comprar NFT
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Adicionar ao carrinho"
            disabled={!canBuy || add.isPending}
            onClick={() => addToCart(false)}
          >
            {add.isSuccess ? <Check /> : <ShoppingCart />}
          </Button>
        </div>
      </div>

      <Dialog
        open={zoomOpen}
        onOpenChange={setZoomOpen}
        title={`Visualização de ${nft.name}`}
        description={`Imagem ${imageIndex + 1} de ${nft.images.length}.`}
      >
        <img className="zoom-image" src={currentImage.src} alt={currentImage.alt} />
      </Dialog>
    </article>
  );
}
