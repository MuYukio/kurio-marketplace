import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuth } from '../auth/session';
import { get, patch, post, fieldErrors } from '@/shared/api/client';
import { networks, type User, type Wallet } from '@/shared/contracts';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Skeleton, ErrorState } from '@/shared/ui/common';
import { AccountNavigation } from '@/shared/layout/account-navigation';

function WalletFields({
  wallet,
  user,
  errors,
}: {
  wallet?: Wallet;
  user: User;
  errors: Record<string, string>;
}) {
  return (
    <div className="wallet-form-grid">
      <Field
        id={`displayName-${wallet?.role || 'new'}`}
        name="displayName"
        label="Nome de exibição*"
        defaultValue={wallet?.displayName || user.name}
        error={errors.displayName}
        required
      />
      <Field
        id={`name-${wallet?.role || 'new'}`}
        name="name"
        label="Apelido da carteira*"
        defaultValue={wallet?.name || user.walletNickname}
        error={errors.name}
        required
      />
      <label className="field">
        Rede*
        <select name="network" defaultValue={wallet?.network || 'Ethereum'}>
          {networks.map((network) => (
            <option key={network}>{network}</option>
          ))}
        </select>
      </label>
      <Field
        id={`profileName-${wallet?.role || 'new'}`}
        name="profileName"
        label="Nome do perfil*"
        defaultValue={wallet?.profileName || user.name}
        error={errors.profileName}
        required
      />
      <Field
        id={`address-${wallet?.role || 'new'}`}
        name="address"
        label="Endereço da carteira*"
        placeholder="Endereço 0x da carteira"
        defaultValue={wallet?.address}
        error={errors.address}
        required
      />
      <Field
        id={`secondaryWallet-${wallet?.role || 'new'}`}
        name="secondaryWallet"
        label="ENS ou carteira secundária (opcional)"
        defaultValue={wallet?.secondaryWallet || ''}
        error={errors.secondaryWallet}
      />
      <label className="field">
        Tipo de carteira*
        <select name="role" defaultValue={wallet?.role || 'secondary'}>
          <option value="primary">Principal</option>
          <option value="secondary">Secundária</option>
        </select>
      </label>
      <Field
        id={`referralCode-${wallet?.role || 'new'}`}
        name="referralCode"
        label="Código de indicação*"
        defaultValue={wallet?.referralCode || 'KURIO'}
        error={errors.referralCode}
        required
      />
      <Field
        id={`walletEmail-${wallet?.role || 'new'}`}
        name="email"
        label="E-mail*"
        type="email"
        defaultValue={wallet?.email || user.email}
        error={errors.email}
        required
      />
      <div className="field">
        <label htmlFor={`walletEns-${wallet?.role || 'new'}`}>Nome ENS*</label>
        <div className="ens-field">
          <span aria-hidden="true">.eth</span>
          <input
            id={`walletEns-${wallet?.role || 'new'}`}
            name="ensName"
            defaultValue={wallet?.ensName || user.ensName}
            aria-invalid={!!errors.ensName}
          />
        </div>
        {errors.ensName && <span className="field-error">{errors.ensName}</span>}
      </div>
    </div>
  );
}

export function WalletsPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const client = useQueryClient();
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  const wallets = useQuery({
    queryKey: ['user', uid, 'wallets'],
    queryFn: ({ signal }) => get<Wallet[]>('/wallets', signal),
  });
  const profile = useQuery({
    queryKey: ['user', uid, 'profile'],
    queryFn: ({ signal }) => get<User>('/profile', signal),
  });
  const primary = wallets.data?.find((wallet) => wallet.role === 'primary');
  const secondary = wallets.data?.find((wallet) => wallet.role === 'secondary');
  const mutation = useMutation({
    mutationFn: ({
      values,
      wallet,
    }: {
      values: Record<string, FormDataEntryValue>;
      wallet?: Wallet;
    }) => (wallet ? patch(`/wallets/${wallet.id}`, values) : post('/wallets', values)),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['user', uid, 'wallets'] });
      setSecondaryOpen(false);
    },
  });
  const errors = fieldErrors(mutation.error);

  return (
    <div className="profile-page wallets-page page-space">
      <AccountNavigation active="wallets" />
      <section className="wallets-content" aria-labelledby="wallets-title">
        <header className="wallets-heading">
          <div>
            <h1 id="wallets-title">Carteira principal</h1>
            <p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              document.getElementById(`displayName-${primary?.role || 'new'}`)?.focus()
            }
          >
            Adicionar
          </button>
        </header>
        {wallets.isPending || profile.isPending ? (
          <Skeleton />
        ) : wallets.isError || profile.isError ? (
          <ErrorState error={wallets.error || profile.error} />
        ) : (
          <>
            <form
              className="wallet-inline-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                  values: Object.fromEntries(new FormData(event.currentTarget)),
                  wallet: primary,
                });
              }}
            >
              <WalletFields wallet={primary} user={profile.data} errors={errors} />
              {mutation.isError && !secondaryOpen && <ErrorState error={mutation.error} />}
              <Button disabled={mutation.isPending}>Salvar carteira</Button>
            </form>

            <section className="secondary-wallet-section">
              <div>
                <h2>Carteira secundária</h2>
                <p>
                  {secondary
                    ? 'Uma carteira secundária está conectada.'
                    : 'Você ainda não adicionou uma carteira secundária.'}
                </p>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={sameAsPrimary}
                  onChange={(event) => setSameAsPrimary(event.target.checked)}
                />{' '}
                Igual à carteira principal
              </label>
              <button
                type="button"
                onClick={() => {
                  mutation.reset();
                  setSecondaryOpen(true);
                }}
              >
                <Plus /> {secondary ? 'Editar' : 'Adicionar'}
              </button>
            </section>
            {secondary && (
              <article className="secondary-wallet-card">
                <h2>{secondary.name}</h2>
                <span>{secondary.network}</span>
                <p>{secondary.address}</p>
                <Button variant="outline" onClick={() => setSecondaryOpen(true)}>
                  Editar carteira
                </Button>
              </article>
            )}
          </>
        )}
      </section>

      {profile.data && (
        <Dialog
          open={secondaryOpen}
          onOpenChange={setSecondaryOpen}
          title={secondary ? 'Editar carteira secundária' : 'Adicionar carteira secundária'}
          description={
            sameAsPrimary
              ? 'Os dados do perfil foram preenchidos a partir da carteira principal.'
              : 'Use um endereço fictício válido para a rede escolhida.'
          }
        >
          <form
            className="secondary-wallet-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(new FormData(event.currentTarget));
              values.role = 'secondary';
              mutation.mutate({ values, wallet: secondary });
            }}
          >
            <WalletFields
              key={`${secondary?.id || 'new'}:${sameAsPrimary}`}
              wallet={secondary || (sameAsPrimary ? primary : undefined)}
              user={profile.data}
              errors={errors}
            />
            {mutation.isError && <ErrorState error={mutation.error} />}
            <Button className="w-full mt-5" disabled={mutation.isPending}>
              Salvar carteira
            </Button>
          </form>
        </Dialog>
      )}
      {mutation.isSuccess && (
        <p className="success wallet-success" role="status">
          Carteiras atualizadas.
        </p>
      )}
    </div>
  );
}
