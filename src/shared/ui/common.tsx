import type { ReactNode, InputHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { errorMessage } from '../api/client';
export function Field({
  label,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-box">
      <p>{errorMessage(error)}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Skeleton({ cards = 1 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Carregando conteúdo" className={cards > 1 ? 'nft-grid' : ''}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Carregando conteúdo</span>
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="eyebrow">Um novo começo</span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children}
    </header>
  );
}
