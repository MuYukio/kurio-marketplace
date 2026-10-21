import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { post, fieldErrors } from '@/shared/api/client';
import type { Session } from '@/shared/contracts';
import { Button } from '@/components/ui/button';
import { ErrorState, Field } from '@/shared/ui/common';
import { PasswordField } from '@/shared/ui/password-field';
import { useAuth } from './session';
import { isAuthPath, safeAuthReturn } from '@/shared/navigation/auth-return';
import './auth.css';

function useDesktopAuthLayout() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 701px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 701px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const desktopLayout = useDesktopAuthLayout();
  const cardRef = useRef<HTMLElement>(null);
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const [mergeError, setMergeError] = useState<unknown>();
  const [auxiliaryMessage, setAuxiliaryMessage] = useState('');
  useEffect(() => {
    if (!auth.loading && auth.session) {
      const destination = safeAuthReturn(search.returnTo);
      void navigate({ href: isAuthPath(destination) ? '/profile' : destination });
    }
  }, [auth.loading, auth.session, navigate, search.returnTo]);
  useEffect(() => {
    if (!desktopLayout) return;
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void navigate({ href: safeAuthReturn(search.returnTo), replace: true });
        return;
      }
      if (event.key !== 'Tab' || !cardRef.current) return;
      const focusable = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() =>
      cardRef.current?.querySelector<HTMLElement>('input, button, a[href]')?.focus(),
    );
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [desktopLayout, navigate, search.returnTo]);
  const mutation = useMutation({
    mutationFn: (values: Record<string, FormDataEntryValue>) =>
      post<Session>(register ? '/auth/register' : '/auth/login', values),
    onSuccess: async (session) => {
      try {
        await auth.accept(session);
        await navigate({ href: safeAuthReturn(search.returnTo), replace: true });
      } catch (error) {
        setMergeError(error);
      }
    },
  });
  const errors = fieldErrors(mutation.error);
  const alternateRoute = register ? '/login' : '/register';
  const unavailable = (label: string) =>
    setAuxiliaryMessage(`${label} não está disponível nesta demonstração. Use uma conta fictícia.`);

  if (auth.session) return <div className="auth-route" aria-busy="true" />;

  return (
    <div className="auth-route" data-layout={desktopLayout ? 'desktop' : 'mobile'}>
      <div className="auth-backdrop" aria-hidden="true" />
      <section
        ref={cardRef}
        className={`auth-card ${register ? 'register' : 'login'}`}
        data-layout={desktopLayout ? 'desktop' : 'mobile'}
        role={desktopLayout ? 'dialog' : undefined}
        aria-modal={desktopLayout ? true : undefined}
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className="auth-close"
          aria-label="Fechar"
          onClick={() => void navigate({ href: safeAuthReturn(search.returnTo), replace: true })}
        >
          <X />
        </button>
        <div className="auth-mobile-brand" aria-label="Kurio">
          KURIO
        </div>
        <nav className="auth-tabs" aria-label="Conta">
          <Link
            to="/login"
            search={{ returnTo: safeAuthReturn(search.returnTo) }}
            aria-current={!register ? 'page' : undefined}
          >
            Entrar
          </Link>
          <span aria-hidden="true">|</span>
          <Link
            to="/register"
            search={{ returnTo: safeAuthReturn(search.returnTo) }}
            aria-current={register ? 'page' : undefined}
          >
            Criar conta
          </Link>
        </nav>
        <h1 id="auth-title" className="auth-mobile-title">
          {register ? 'Criar perfil de colecionador' : 'Entrar'}
        </h1>
        <p className="auth-description">
          {register
            ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
            : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setAuxiliaryMessage('');
            mutation.mutate(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          {register && (
            <Field
              id="name"
              name="name"
              label="Nome de usuário"
              placeholder="Nome de usuário"
              autoComplete="username"
              required
              error={errors.name}
            />
          )}
          <Field
            id="email"
            name="email"
            label="E-mail"
            placeholder={register ? 'Digite seu e-mail' : 'contato@email.com'}
            type="email"
            autoComplete="email"
            required
            error={errors.email}
          />
          <PasswordField
            id="password"
            name="password"
            label="Senha"
            autoComplete={register ? 'new-password' : 'current-password'}
            error={errors.password}
            placeholder
          />
          {register && (
            <PasswordField
              id="confirm"
              name="confirm"
              label="Confirmar senha"
              autoComplete="new-password"
              error={errors.confirm}
              placeholder
            />
          )}
          {!register && (
            <button
              type="button"
              className="auth-forgot"
              onClick={() => unavailable('Recuperação de senha')}
            >
              Esqueceu a senha?
            </button>
          )}
          {mutation.isError && <ErrorState error={mutation.error} />}
          {!!mergeError && <ErrorState error={mergeError} />}
          <Button className="auth-submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>
        <div className="auth-divider">
          <span>Ou continue com</span>
        </div>
        <div className="auth-socials">
          <button type="button" onClick={() => unavailable('Login com Google')}>
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continuar com Google
          </button>
          <button type="button" onClick={() => unavailable('Login com Facebook')}>
            <span className="facebook-mark" aria-hidden="true">
              f
            </span>
            Continuar com Facebook
          </button>
        </div>
        {auxiliaryMessage && (
          <p role="status" className="auth-auxiliary-message">
            {auxiliaryMessage}
          </p>
        )}
        <p className="auth-switch-mobile">
          {register ? 'Já tem uma conta?' : 'Novo na Kurio?'}{' '}
          <Link to={alternateRoute} search={{ returnTo: safeAuthReturn(search.returnTo) }}>
            {register ? 'Entre' : 'Crie uma conta'}
          </Link>
        </p>
      </section>
    </div>
  );
}
