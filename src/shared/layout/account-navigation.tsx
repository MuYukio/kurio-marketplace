import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  CircleAlert,
  Download,
  Heart,
  LogOut,
  ShoppingCart,
  Tag,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '@/features/auth/session';

const unavailableItems = [
  [ShoppingCart, 'Atividade'],
  [Heart, 'Lista de interesse'],
  [Tag, 'Ofertas'],
  [Download, 'Arquivos baixados'],
  [CircleAlert, 'Suporte'],
] as const;

export function AccountNavigation({ active }: { active: 'profile' | 'wallets' }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  return (
    <aside className="profile-navigation" aria-label="Meu perfil">
      <h2>Meu perfil</h2>
      <nav>
        <Link to="/profile" aria-current={active === 'profile' ? 'page' : undefined}>
          <UserRound /> Dados do perfil
        </Link>
        <Link to="/wallets" aria-current={active === 'wallets' ? 'page' : undefined}>
          <WalletCards /> Carteiras
        </Link>
        {unavailableItems.map(([Icon, label]) => (
          <button
            key={label}
            type="button"
            aria-disabled="true"
            onClick={() => setMessage(`${label} não está disponível nesta demonstração.`)}
          >
            <Icon /> {label}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="profile-logout"
        onClick={() => void auth.logout().then(() => navigate({ to: '/' }))}
      >
        <LogOut /> Sair
      </button>
      {message && (
        <p className="sr-only" role="status">
          {message}
        </p>
      )}
    </aside>
  );
}
