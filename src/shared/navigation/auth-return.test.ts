import { describe, expect, it } from 'vitest';
import { isAuthPath, safeAuthReturn } from './auth-return';

describe('safeAuthReturn', () => {
  it('preserva rotas internas e seus parâmetros', () => {
    expect(safeAuthReturn('/pagamento?step=review#total')).toBe('/pagamento?step=review#total');
  });

  it('rejeita destinos externos e inválidos', () => {
    expect(safeAuthReturn('https://example.com')).toBe('/');
    expect(safeAuthReturn('//example.com')).toBe('/');
    expect(safeAuthReturn(undefined)).toBe('/');
  });

  it('interrompe login e cadastro recursivos', () => {
    expect(safeAuthReturn('/login')).toBe('/');
    expect(safeAuthReturn('/register?returnTo=%2Flogin')).toBe('/');
    expect(safeAuthReturn('/cadastro?returnTo=%2Fcadastro')).toBe('/');
    expect(safeAuthReturn('/login?returnTo=%2Flogin%3FreturnTo%3D%252Fcart')).toBe('/');
  });
});

describe('isAuthPath', () => {
  it('reconhece somente as páginas de autenticação', () => {
    expect(isAuthPath('/login')).toBe(true);
    expect(isAuthPath('/register')).toBe(true);
    expect(isAuthPath('/cadastro')).toBe(true);
    expect(isAuthPath('/profile')).toBe(false);
  });
});
