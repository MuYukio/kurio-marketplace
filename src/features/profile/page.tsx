import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useAuth } from '../auth/session';
import { get, patch, post, fieldErrors } from '@/shared/api/client';
import type { User } from '@/shared/contracts';
import { Button } from '@/components/ui/button';
import { Field, Skeleton, ErrorState } from '@/shared/ui/common';
import { PasswordField } from '@/shared/ui/password-field';
import { AccountNavigation } from '@/shared/layout/account-navigation';

function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient();
  const [avatar, setAvatar] = useState(user.avatar);
  const [fileError, setFileError] = useState('');
  const save = useMutation({
    mutationFn: async (values: Record<string, FormDataEntryValue>) => {
      const { current, password, confirm, ...profile } = values;
      const passwordChanged = Boolean(current || password || confirm);
      const updated = await patch<User>('/profile', { ...profile, avatar });
      if (passwordChanged) await post('/profile/password', { current, password, confirm });
      return { updated, passwordChanged };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['user', user.id, 'profile'] });
      void client.invalidateQueries({ queryKey: ['session'] });
    },
  });
  const errors = fieldErrors(save.error);

  return (
    <form
      id="dados"
      noValidate
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
      }}
    >
      <h1>Perfil do colecionador</h1>
      <input type="hidden" name="bio" value={user.bio} readOnly />

      <div className="profile-fields-grid">
        <Field
          id="name"
          name="name"
          label="Nome de exibição*"
          defaultValue={user.name}
          error={errors.name}
          required
        />
        <Field
          id="username"
          name="username"
          label="Nome de usuário*"
          defaultValue={user.username}
          error={errors.username}
          required
        />
        <Field
          id="email"
          name="email"
          label="E-mail*"
          type="email"
          defaultValue={user.email}
          error={errors.email}
          required
        />
        <div className="field">
          <label htmlFor="ensName">Nome ENS*</label>
          <div className="ens-field">
            <span aria-hidden="true">.eth</span>
            <input
              id="ensName"
              name="ensName"
              defaultValue={user.ensName}
              aria-invalid={!!errors.ensName}
              aria-describedby={errors.ensName ? 'ensName-error' : undefined}
            />
          </div>
          {errors.ensName && (
            <span id="ensName-error" className="field-error">
              {errors.ensName}
            </span>
          )}
        </div>
        <Field
          id="walletNickname"
          name="walletNickname"
          label="Apelido da carteira*"
          defaultValue={user.walletNickname}
          error={errors.walletNickname}
          required
        />
        <div className="profile-avatar-field">
          <span>Avatar</span>
          <div className="avatar-editor">
            {avatar ? (
              <img src={avatar} alt="Seu avatar" width="48" height="48" />
            ) : (
              <div className="avatar-placeholder">
                <ImagePlus />
              </div>
            )}
            <label className="profile-avatar-button">
              Alterar
              <input
                type="file"
                aria-label="Enviar avatar"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 250000 ||
                    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                  ) {
                    setFileError('Use PNG, JPEG ou WebP de até 250 KB.');
                    return;
                  }
                  setFileError('');
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button
              type="button"
              className="profile-avatar-remove"
              onClick={() => {
                setAvatar('');
                setFileError('');
              }}
            >
              Remover
            </button>
          </div>
          {fileError && (
            <span role="alert" className="field-error">
              {fileError}
            </span>
          )}
        </div>
      </div>

      <section className="profile-password" aria-labelledby="password-title">
        <h2 id="password-title">Alterar senha</h2>
        <PasswordField
          id="current"
          name="current"
          label="Senha atual"
          autoComplete="current-password"
          error={errors.current}
        />
        <PasswordField
          id="password"
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          error={errors.password}
        />
        <PasswordField
          id="confirm"
          name="confirm"
          label="Confirmar nova senha"
          autoComplete="new-password"
          error={errors.confirm}
        />
      </section>

      {save.isError && <ErrorState error={save.error} />}
      <Button className="profile-save" disabled={save.isPending || !!fileError}>
        Salvar
      </Button>
      {save.isSuccess && (
        <p className="success" role="status">
          {save.data.passwordChanged ? 'Senha atualizada.' : 'Perfil atualizado.'}
        </p>
      )}
    </form>
  );
}

export function ProfilePage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const profile = useQuery({
    queryKey: ['user', uid, 'profile'],
    queryFn: ({ signal }) => get<User>('/profile', signal),
  });

  return (
    <div className="profile-page page-space">
      <AccountNavigation active="profile" />
      {profile.isPending ? (
        <Skeleton />
      ) : profile.isError ? (
        <ErrorState error={profile.error} />
      ) : (
        <ProfileForm user={profile.data} />
      )}
    </div>
  );
}
