import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  placeholder = false,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  placeholder?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`field password-field ${placeholder ? 'auth-password-field' : ''}`}>
      <label className={placeholder ? 'sr-only' : undefined} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder ? label : undefined}
        minLength={8}
        autoComplete={autoComplete}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button
        type="button"
        aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <Eye /> : <EyeOff />}
      </button>
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
