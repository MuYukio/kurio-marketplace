import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { DemoPanel } from '@/features/demo/panel';

const footerGroups = [
  {
    title: 'Meu perfil',
    items: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    items: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    items: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
] as const;

function InactiveFooterLink({ children }: { children: string }) {
  return (
    <span aria-disabled="true" title="Indisponível nesta demonstração">
      {children}
    </span>
  );
}

export function SiteFooter({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  const [newsletterNotice, setNewsletterNotice] = useState('');

  return (
    <footer className={`site-footer ${hideOnMobile ? 'hide-on-mobile-detail' : ''}`}>
      <div className="footer-features">
        <article>
          <span className="footer-letter">W</span>
          <h2>Segurança da carteira</h2>
          <p>Proteja sua carteira e colecione arte digital verificada com confiança.</p>
        </article>
        <article>
          <span className="footer-letter">C</span>
          <h2>Criadores em destaque</h2>
          <p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p>
        </article>
        <article>
          <span className="footer-letter">D</span>
          <h2>Alertas de lançamentos</h2>
          <p>
            Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
          </p>
        </article>
        <form
          className="footer-newsletter"
          onSubmit={(event) => {
            event.preventDefault();
            setNewsletterNotice('Inscrição indisponível nesta demonstração.');
          }}
        >
          <h2>Antecipe-se ao próximo lançamento</h2>
          <div>
            <label className="sr-only" htmlFor="footer-email">
              Seu e-mail
            </label>
            <input id="footer-email" type="email" placeholder="digite seu e-mail..." required />
            <button type="submit">Enviar</button>
          </div>
          <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          {newsletterNotice && <span role="status">{newsletterNotice}</span>}
        </form>
      </div>

      <div className="footer-contact">
        <Link to="/" className="footer-wordmark" aria-label="Kurio, início">
          KURIO
        </Link>
        <p>Feito para colecionadores, criadores e cultura</p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </div>

      <div className="footer-directory">
        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item, index) =>
              group.title === 'Meu perfil' && index === 0 ? (
                <Link key={item} to="/profile">
                  {item}
                </Link>
              ) : (
                <InactiveFooterLink key={item}>{item}</InactiveFooterLink>
              ),
            )}
          </nav>
        ))}
        <section className="footer-social">
          <h2>Redes sociais</h2>
          <div className="social-list" aria-label="Redes sociais indisponíveis">
            {['f', '◎', '♥', 'in', '▶'].map((network) => (
              <button key={network} aria-disabled="true" title="Indisponível nesta demonstração">
                {network}
              </button>
            ))}
          </div>
          <h2>Carteiras compatíveis</h2>
          <p>METAMASK · WALLETCONNECT · COINBASE</p>
        </section>
      </div>

      <div className="footer-legal">
        <span>© 2026 Kurio. Propriedade digital para todos.</span>
        <DemoPanel />
      </div>
    </footer>
  );
}
