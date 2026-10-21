import { Link, useRouterState } from '@tanstack/react-router';
import { Heart, Home, ShoppingCart, Store, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/session';
import { useCart } from '@/features/cart/hooks';
import { Button } from '@/components/ui/button';
import { safeAuthReturn } from '@/shared/navigation/auth-return';

export function MobileBottomNav() {
  const { session } = useAuth();
  const cart = useCart();
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const count = cart.data?.items.length || 0;
  const accountTo = session ? '/profile' : '/login';

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação principal mobile">
      <Button asChild variant="ghost" size="icon" className={pathname === '/' ? 'active' : ''}>
        <Link to="/" aria-label="Início">
          <Home />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="icon">
        <a href="/?tab=popular#catalogo" aria-label="Favoritos e destaques">
          <Heart />
        </a>
      </Button>
      <Button asChild size="icon" className="mobile-market-action">
        <a href="/#catalogo" aria-label="Explorar mercado">
          <Store />
        </a>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={pathname === '/cart' ? 'active mobile-cart-action' : 'mobile-cart-action'}
      >
        <Link to="/cart" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
          <ShoppingCart />
          {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={pathname === '/profile' ? 'active' : ''}
      >
        <Link
          to={accountTo}
          search={session ? undefined : { returnTo: safeAuthReturn(location.href) }}
          aria-label={session ? 'Meu perfil' : 'Entrar'}
        >
          <UserRound />
        </Link>
      </Button>
    </nav>
  );
}
