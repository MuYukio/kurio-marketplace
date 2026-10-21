import { createRootRoute, createRoute, createRouter, redirect, Link } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Shell } from './shell';
import { catalogSchema } from '@/shared/contracts';
import { authStorage, get } from '@/shared/api/client';
import { useAuth } from '@/features/auth/session';
import { CatalogPageView } from '@/features/catalog/page';
import { DetailPage } from '@/features/catalog/detail';
import { isAuthPath, safeAuthReturn } from '@/shared/navigation/auth-return';
import { Empty, ErrorState, Skeleton } from '@/shared/ui/common';
import { Button } from '@/components/ui/button';
import axios from 'axios';
// Telas fora do caminho crítico de Início/Detalhe são carregadas sob demanda.
const AuthPage = lazy(() => import('@/features/auth/pages').then((m) => ({ default: m.AuthPage })));
const CartPage = lazy(() => import('@/features/cart/page').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() =>
  import('@/features/checkout/page').then((m) => ({ default: m.CheckoutPage })),
);
const OrderPage = lazy(() =>
  import('@/features/orders/page').then((m) => ({ default: m.OrderPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/page').then((m) => ({ default: m.ProfilePage })),
);
const WalletsPage = lazy(() =>
  import('@/features/wallets/page').then((m) => ({ default: m.WalletsPage })),
);
function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton />}>{children}</Suspense>;
}
function Private({ children }: { children: ReactNode }) {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    if (!auth.loading && !auth.session && !auth.error && !isAuthPath(location.pathname))
      void navigate({
        to: '/login',
        search: { returnTo: safeAuthReturn(location.href) },
        replace: true,
      });
  }, [auth.loading, auth.session, auth.error, location, navigate]);
  if (auth.error) return <ErrorState error={auth.error} retry={auth.retrySession} />;
  return auth.session ? children : <Skeleton />;
}
const root = createRootRoute({
  component: Shell,
  notFoundComponent: () => (
    <Empty title="Página não encontrada">
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </Empty>
  ),
  errorComponent: ({ error, reset }) => <ErrorState error={error} retry={reset} />,
});
const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  validateSearch: (input) => catalogSchema.parse(input),
  component: CatalogPageView,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: '/mercado/$nftId',
  component: DetailPage,
});
const legacyDetail = createRoute({
  getParentRoute: () => root,
  path: '/nfts/$nftId',
  component: DetailPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: '/cart',
  component: () => (
    <Deferred>
      <CartPage />
    </Deferred>
  ),
});
const canonicalCart = createRoute({
  getParentRoute: () => root,
  path: '/carrinho',
  component: () => (
    <Deferred>
      <CartPage />
    </Deferred>
  ),
});
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  validateSearch: (s: Record<string, unknown>) => ({ returnTo: safeAuthReturn(s.returnTo) }),
  component: () => (
    <Deferred>
      <AuthPage />
    </Deferred>
  ),
});
const register = createRoute({
  getParentRoute: () => root,
  path: '/register',
  validateSearch: (s: Record<string, unknown>) => ({ returnTo: safeAuthReturn(s.returnTo) }),
  component: () => (
    <Deferred>
      <AuthPage register />
    </Deferred>
  ),
});
const canonicalRegister = createRoute({
  getParentRoute: () => root,
  path: '/cadastro',
  validateSearch: (s: Record<string, unknown>) => ({ returnTo: safeAuthReturn(s.returnTo) }),
  component: () => (
    <Deferred>
      <AuthPage register />
    </Deferred>
  ),
});
const privateRoot = createRoute({
  getParentRoute: () => root,
  id: 'authenticated',
  beforeLoad: async ({ location }) => {
    if (!authStorage.token())
      throw redirect({
        to: '/login',
        search: { returnTo: safeAuthReturn(location.href) },
        replace: true,
      });
    try {
      await get('/session');
    } catch (error) {
      if (!authStorage.token() || (axios.isAxiosError(error) && error.response?.status === 401))
        throw redirect({
          to: '/login',
          search: { returnTo: safeAuthReturn(location.href) },
          replace: true,
        });
      throw error;
    }
  },
});
const checkout = createRoute({
  getParentRoute: () => privateRoot,
  path: '/pagamento',
  component: () => (
    <Private>
      <Deferred>
        <CheckoutPage />
      </Deferred>
    </Private>
  ),
});
const legacyCheckout = createRoute({
  getParentRoute: () => privateRoot,
  path: '/checkout',
  component: () => (
    <Private>
      <Deferred>
        <CheckoutPage />
      </Deferred>
    </Private>
  ),
});
const orders = createRoute({
  getParentRoute: () => privateRoot,
  path: '/orders/$orderId',
  component: () => (
    <Private>
      <Deferred>
        <OrderPage />
      </Deferred>
    </Private>
  ),
});
const canonicalOrder = createRoute({
  getParentRoute: () => privateRoot,
  path: '/pedido/$orderId',
  component: () => (
    <Private>
      <Deferred>
        <OrderPage />
      </Deferred>
    </Private>
  ),
});
const confirmation = createRoute({
  getParentRoute: () => privateRoot,
  path: '/orders/$orderId/confirmation',
  component: () => (
    <Private>
      <Deferred>
        <OrderPage />
      </Deferred>
    </Private>
  ),
});
const profile = createRoute({
  getParentRoute: () => privateRoot,
  path: '/profile',
  component: () => (
    <Private>
      <Deferred>
        <ProfilePage />
      </Deferred>
    </Private>
  ),
});
const canonicalProfile = createRoute({
  getParentRoute: () => privateRoot,
  path: '/perfil',
  component: () => (
    <Private>
      <Deferred>
        <ProfilePage />
      </Deferred>
    </Private>
  ),
});
const wallets = createRoute({
  getParentRoute: () => privateRoot,
  path: '/wallets',
  component: () => (
    <Private>
      <Deferred>
        <WalletsPage />
      </Deferred>
    </Private>
  ),
});
const canonicalWallets = createRoute({
  getParentRoute: () => privateRoot,
  path: '/perfil/carteiras',
  component: () => (
    <Private>
      <Deferred>
        <WalletsPage />
      </Deferred>
    </Private>
  ),
});
const routeTree = root.addChildren([
  index,
  detail,
  legacyDetail,
  cart,
  canonicalCart,
  login,
  register,
  canonicalRegister,
  privateRoot.addChildren([
    checkout,
    legacyCheckout,
    orders,
    canonicalOrder,
    confirmation,
    profile,
    canonicalProfile,
    wallets,
    canonicalWallets,
  ]),
]);
export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultPendingComponent: () => <Skeleton />,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
