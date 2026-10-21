import { Outlet, useRouterState } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/session';
import { SiteHeader } from '@/shared/layout/site-header';
import { SiteFooter } from '@/shared/layout/site-footer';
import { MobileBottomNav } from '@/shared/layout/mobile-bottom-nav';
import { useRealtime } from '@/shared/realtime/provider';
export function Shell() {
  const auth = useAuth(),
    { connected } = useRealtime(),
    pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOrderRoute = pathname.startsWith('/orders/') || pathname.startsWith('/pedido/');
  const isCartRoute = pathname === '/cart' || pathname === '/carrinho';
  const hideFooterOnMobile = pathname === '/' || isCartRoute;
  const immersiveMobile =
    pathname.startsWith('/mercado') ||
    pathname.startsWith('/nfts') ||
    pathname === '/checkout' ||
    pathname === '/pagamento' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/cadastro';
  useEffect(() => {
    document.title =
      pathname === '/'
        ? 'Kurio — Arte digital para colecionar'
        : `Kurio — ${pathname.startsWith('/mercado') || pathname.startsWith('/nfts') ? 'Detalhe da obra' : pathname === '/cart' ? 'Carrinho' : pathname === '/checkout' || pathname === '/pagamento' ? 'Pagamento' : 'Colecionador'}`;
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para conteúdo
      </a>
      <SiteHeader hideOnMobile={immersiveMobile} />
      {auth.notice && (
        <div className="notice" role="status">
          <span>{auth.notice}</span>
          <button aria-label="Dispensar aviso" onClick={() => auth.setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      <main
        id="conteudo"
        data-realtime={connected ? 'connected' : 'connecting'}
        className={`container ${pathname.startsWith('/mercado') || pathname.startsWith('/nfts') ? 'detail-main-container' : ''} ${isOrderRoute ? 'order-main-container' : ''}`}
      >
        <Outlet />
      </main>
      {!isOrderRoute && <SiteFooter hideOnMobile={immersiveMobile || hideFooterOnMobile} />}
      {!immersiveMobile && !isOrderRoute && !isCartRoute && <MobileBottomNav />}
    </>
  );
}
