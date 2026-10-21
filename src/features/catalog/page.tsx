import { useState } from 'react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight, Search, SlidersHorizontal, Heart } from 'lucide-react';
import { catalogSchema, type CatalogPage, type NFT, networks } from '@/shared/contracts';
import { get } from '@/shared/api/client';
import { eth } from '@/shared/money/eth';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton, ErrorState, Empty } from '@/shared/ui/common';
import { useFavorites } from '../favorites/hooks';
import './catalog.css';
export function NftCard({ nft }: { nft: NFT }) {
  const fav = useFavorites();
  const liked = fav.data?.includes(nft.id) || false;
  return (
    <article className="nft-card">
      <div className="art-frame">
        <Link to="/mercado/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.name}`}>
          <img
            src={nft.image}
            srcSet={
              nft.image === '/assets/nft-emerald-ape-042.webp'
                ? '/assets/nft-emerald-ape-042-480.webp 480w, /assets/nft-emerald-ape-042.webp 900w'
                : undefined
            }
            sizes="(max-width: 700px) 140px, (max-width: 1000px) 30vw, 240px"
            alt={`Obra digital ${nft.name}`}
            width="640"
            height="640"
            loading="lazy"
          />
        </Link>
        {fav.authenticated && (
          <button
            className="favorite"
            aria-label={`${liked ? 'Remover' : 'Adicionar'} ${nft.name} ${liked ? 'dos' : 'aos'} favoritos`}
            aria-pressed={liked}
            disabled={fav.toggle.isPending}
            onClick={() => fav.toggle.mutate({ id: nft.id, remove: liked })}
          >
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}
        <span className="network-badge">{nft.network}</span>
      </div>
      <div className="card-meta">
        <Link to="/mercado/$nftId" params={{ nftId: nft.id }}>
          <h3>{nft.name}</h3>
        </Link>
        <span className="muted tiny">{nft.collection}</span>
        <div className="flex items-center justify-between mt-3">
          <strong className="price">{eth(nft.editions[0].priceEth)}</strong>
          <ArrowUpRight size={17} className="text-muted-foreground" />
        </div>
      </div>
      {fav.toggle.isError && <ErrorState error={fav.toggle.error} />}
    </article>
  );
}
export function CatalogPageView() {
  const s = catalogSchema.parse(useSearch({ strict: false })),
    navigate = useNavigate(),
    [filtersOpen, setFiltersOpen] = useState(false);
  const query = useQuery({
    queryKey: ['nfts', s],
    queryFn: ({ signal }) => get<CatalogPage>('/nfts', signal, s),
    placeholderData: (previous) => previous,
  });
  const update = (values: Partial<typeof s>) =>
    void navigate({
      to: '/',
      search: { ...s, ...values, page: values.page ?? 1 },
      resetScroll: false,
    });
  const filters = (
    <div className="filter-content">
      <h3>Coleções</h3>
      <button
        className={!s.category ? 'filter-item active' : 'filter-item'}
        onClick={() => update({ category: '' })}
      >
        Todas as coleções
      </button>
      {(
        query.data?.categories || [
          'Arte digital',
          'Fotografia',
          'Música',
          'Arte 3D',
          'Colecionáveis',
          'Generativa',
        ]
      ).map((c) => (
        <button
          key={c}
          className={s.category === c ? 'filter-item active' : 'filter-item'}
          aria-pressed={s.category === c}
          onClick={() => update({ category: s.category === c ? '' : c })}
        >
          <span>{c}</span>
          <span aria-label={`${query.data?.categoryCounts[c] || 0} obras`}>
            ({query.data?.categoryCounts[c] || 0})
          </span>
        </button>
      ))}
      <h3>Faixa de preço</h3>
      <form
        key={`${s.min}:${s.max}`}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          update({ min: String(data.get('min')), max: String(data.get('max')) });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="tiny">
            Mínimo
            <input
              name="min"
              aria-label="Preço mínimo"
              inputMode="decimal"
              defaultValue={s.min}
              placeholder="0"
              pattern="[0-9]+([.][0-9]{1,18})?"
            />
          </label>
          <label className="tiny">
            Máximo
            <input
              name="max"
              aria-label="Preço máximo"
              inputMode="decimal"
              defaultValue={s.max}
              placeholder="10"
              pattern="[0-9]+([.][0-9]{1,18})?"
            />
          </label>
        </div>
        <Button className="mt-3" size="sm">
          Aplicar preço
        </Button>
      </form>
      <h3>Rede</h3>
      {networks.map((n) => (
        <label className="filter-checkbox" key={n}>
          <input
            type="checkbox"
            checked={s.network === n}
            onChange={() => update({ network: s.network === n ? '' : n })}
          />
          {n}
        </label>
      ))}
      <button
        className="text-link mt-5"
        onClick={() =>
          update({ q: '', category: '', network: '', min: '', max: '', tab: 'all', sort: 'recent' })
        }
      >
        Limpar filtros
      </button>
    </div>
  );
  return (
    <>
      <form
        className="mobile-home-search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: String(new FormData(event.currentTarget).get('q') || '') });
          document.getElementById('catalogo')?.scrollIntoView();
        }}
      >
        <Search aria-hidden="true" />
        <input
          name="q"
          aria-label="Explorar coleções"
          placeholder="Explorar coleções"
          defaultValue={s.q}
        />
        <Button
          type="button"
          size="icon"
          aria-label="Abrir filtros"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal />
        </Button>
      </form>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="accent-dot" /> Bem-vindo à Kurio
          </span>
          <h1 className="desktop-hero-title">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
          <h1 className="mobile-hero-title">SEJA DONO DA CULTURA DIGITAL</h1>
          <p>
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Button asChild>
            <a href="#catalogo">
              Explorar coleção <ArrowUpRight />
            </a>
          </Button>
          <div className="hero-note">
            <span aria-current="true" />
            <span />
            <span />
          </div>
        </div>
        <Link className="hero-art" to="/mercado/$nftId" params={{ nftId: 'nft-1' }}>
          <img
            src="/assets/nft-emerald-ape-042.webp"
            srcSet="/assets/nft-emerald-ape-042-480.webp 480w, /assets/nft-emerald-ape-042.webp 900w"
            sizes="(max-width: 700px) 43vw, 640px"
            alt="Emerald Ape, colecionável digital em verde e cobre"
            width="640"
            height="640"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-caption">
            <div>
              <span className="tiny">CURADORIA KURIO</span>
              <strong>Emerald Ape #042</strong>
            </div>
            <span className="round-arrow">
              <ArrowUpRight />
            </span>
          </div>
          <span className="hero-mobile-thumb">
            <img src="/assets/nft-sage-nomad-009.jpg" alt="Sage Nomad" />
          </span>
        </Link>
      </section>
      <section id="catalogo" className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Encontre sua próxima obra</span>
            <h2>O extraordinário é seu.</h2>
          </div>
          <span className="muted tiny hidden md:block">
            Coleções para novos olhares <ArrowRight size={14} className="inline" />
          </span>
        </div>
        <div className="catalog-layout">
          <aside className="filters desktop-filters">
            {filters}
            <Link className="sidebar-featured" to="/mercado/$nftId" params={{ nftId: 'nft-3' }}>
              <span>NFT EM DESTAQUE</span>
              <strong>OFERTA LIMITADA</strong>
              <img src="/assets/nft-sage-nomad-009.jpg" alt="Sage Nomad em destaque" />
            </Link>
          </aside>
          <div className="catalog-main">
            <div className="catalog-toolbar">
              <div role="group" aria-label="Seleção do catálogo" className="tabs">
                {(['all', 'new', 'popular'] as const).map((tab, i) => (
                  <button
                    key={tab}
                    aria-pressed={s.tab === tab}
                    className={s.tab === tab ? 'active' : ''}
                    onClick={() => update({ tab })}
                  >
                    {['Todos os NFTs', 'Novos', 'Em alta'][i]}
                  </button>
                ))}
              </div>
              <label className="sort-label">
                Ordenar
                <select
                  aria-label="Ordenar NFTs"
                  value={s.sort}
                  onChange={(e) => update({ sort: e.target.value as typeof s.sort })}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name">Nome</option>
                </select>
              </label>
            </div>
            <div className="search-row">
              <form
                key={s.q}
                className="search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  update({ q: String(new FormData(e.currentTarget).get('q') || '') });
                }}
              >
                <Search size={17} />
                <input
                  aria-label="Buscar no catálogo"
                  name="q"
                  placeholder="Encontre uma obra, coleção ou artista"
                  defaultValue={s.q}
                />
                <Button size="sm" variant="ghost">
                  Buscar
                </Button>
              </form>
              <Button
                className="mobile-filter-trigger"
                variant="outline"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal /> Filtros
              </Button>
            </div>
            {query.isPending ? (
              <Skeleton cards={6} />
            ) : query.isError ? (
              <ErrorState error={query.error} retry={() => void query.refetch()} />
            ) : query.data.items.length === 0 ? (
              <Empty title="Nenhuma obra encontrada">
                <p>Experimente outro termo ou remova os filtros.</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    update({ q: '', category: '', network: '', min: '', max: '', tab: 'all' })
                  }
                >
                  Limpar busca e filtros
                </Button>
              </Empty>
            ) : (
              <>
                <p className="result-count" aria-live="polite">
                  {query.data.total} obras encontradas {query.isFetching ? '· Atualizando…' : ''}
                </p>
                <div className="nft-grid">
                  {query.data.items.map((n) => (
                    <NftCard key={n.id} nft={n} />
                  ))}
                </div>
                <nav aria-label="Paginação" className="pagination">
                  {Array.from({ length: query.data.pages }, (_, i) => (
                    <Button
                      key={i}
                      size="icon"
                      variant={s.page === i + 1 ? 'default' : 'ghost'}
                      aria-label={`Página ${i + 1}`}
                      aria-current={s.page === i + 1 ? 'page' : undefined}
                      onClick={() => update({ page: i + 1 })}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </nav>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="home-promos" aria-label="Descobertas Kurio">
        <article>
          <img src="/assets/nft-emerald-ape-042.webp" alt="Emerald Ape" />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>Colecione edições escassas diretamente dos criadores.</p>
            <Button asChild size="sm">
              <a href="#catalogo">
                Explorar <ArrowRight />
              </a>
            </Button>
          </div>
        </article>
        <article>
          <img src="/assets/nft-ivory-baron-088.png" alt="Seleção de arte digital" />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>Explore artistas, coleções verificadas e obras digitais.</p>
            <Button asChild size="sm">
              <a href="#catalogo">
                Explorar <ArrowRight />
              </a>
            </Button>
          </div>
        </article>
      </section>
      <section className="home-journal" aria-labelledby="journal-title">
        <h2 id="journal-title">Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
        <div className="journal-grid">
          {[
            ['nft-ivory-baron-088.png', 'Como funciona a propriedade de NFTs'],
            ['nft-emerald-ape-042.webp', '10 artistas digitais para acompanhar'],
            ['nft-sage-nomad-009.jpg', 'Raridade, atributos e procedência'],
            ['nft-golden-beat-207.png', 'Como proteger sua carteira'],
          ].map(([image, title], index) => (
            <article key={title}>
              <img src={`/assets/${image}`} alt="" />
              <div>
                <small>
                  {12 + index} de setembro · Leitura de {index + 2} min
                </small>
                <h3>{title}</h3>
                <p>Conteúdo editorial demonstrativo da Kurio.</p>
                <span>Em breve →</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtros"
        description="Combine coleção, preço e rede."
      >
        <label className="mobile-filter-sort">
          Ordenar resultados
          <select
            aria-label="Ordenar resultados"
            value={s.sort}
            onChange={(event) => update({ sort: event.target.value as typeof s.sort })}
          >
            <option value="recent">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name">Nome</option>
          </select>
        </label>
        {filters}
        <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
          Ver resultados
        </Button>
      </Dialog>
    </>
  );
}
