import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { LogIn, LogOut, Menu, Search, ShoppingCart, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth/session';
import { useCart } from '@/features/cart/hooks';
import { Button } from '@/components/ui/button';
import { safeAuthReturn } from '@/shared/navigation/auth-return';

function UnavailableNavItem({ children }: { children: string }) {
  return (
    <button
      className="nav-unavailable"
      aria-disabled="true"
      title="Indisponível nesta demonstração"
    >
      {children}
    </button>
  );
}

export function SiteHeader({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  const auth = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const itemCount = cart.data?.items.length || 0;

  return (
    <header className={`site-header ${hideOnMobile ? 'hide-on-mobile-detail' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="header-wordmark" aria-label="Kurio, início">
          KURIO
        </Link>

        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
            Início
          </Link>
          <a
            href="/#catalogo"
            className={
              pathname.startsWith('/mercado') || pathname.startsWith('/nfts') ? 'active' : ''
            }
          >
            Mercado
          </a>
          <UnavailableNavItem>Criadores</UnavailableNavItem>
          <UnavailableNavItem>Aprenda</UnavailableNavItem>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-link header-search"
            aria-label="Buscar no mercado"
            aria-expanded={searchOpen}
            aria-controls="header-search-panel"
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search aria-hidden="true" />
          </button>
          <Link
            to="/cart"
            className="header-icon-link cart-link"
            aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingCart aria-hidden="true" />
            {itemCount > 0 && <span>{itemCount > 99 ? '99+' : itemCount}</span>}
          </Link>

          {auth.session ? (
            <>
              <Button asChild variant="ghost" className="desktop-account">
                <Link to="/profile">
                  <UserRound /> {auth.session.user.name.split(' ')[0]}
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Sair da conta"
                onClick={() => void auth.logout().then(() => navigate({ to: '/' }))}
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="header-login">
              <Link to="/login" search={{ returnTo: safeAuthReturn(location.href) }}>
                <LogIn /> Entrar
              </Link>
            </Button>
          )}

          <Button
            className="mobile-menu-button"
            size="icon"
            variant="ghost"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {searchOpen && (
        <form id="header-search-panel" className="header-search-panel" action="/" method="get">
          <label htmlFor="header-market-search">Buscar NFTs, coleções ou artistas</label>
          <div>
            <Search aria-hidden="true" />
            <input
              id="header-market-search"
              name="q"
              aria-label="Buscar NFTs"
              placeholder="Encontre uma obra, coleção ou artista"
              autoFocus
            />
            <Button type="submit">Buscar</Button>
          </div>
        </form>
      )}

      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação mobile">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Início
          </Link>
          <a href="/#catalogo" onClick={() => setMenuOpen(false)}>
            Mercado
          </a>
          <UnavailableNavItem>Criadores</UnavailableNavItem>
          <UnavailableNavItem>Aprenda</UnavailableNavItem>
          {auth.session && (
            <>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>
                Meu perfil
              </Link>
              <Link to="/wallets" onClick={() => setMenuOpen(false)}>
                Carteiras
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
