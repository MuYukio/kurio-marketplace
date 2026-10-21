import { describe, it, expect } from 'vitest';
import { toWei, fromWei, total } from './eth';
describe('ETH exato', () => {
  it('soma sem float', () => expect(total(['0.1', '0.2'])).toBe('0.3'));
  it('preserva 1 wei', () =>
    expect(fromWei(toWei('0.000000000000000001') * 3n)).toBe('0.000000000000000003'));
  it('rejeita formatos não suportados', () => {
    for (const s of ['1e-8', '-1', 'NaN', '1.1234567890123456789'])
      expect(() => toWei(s)).toThrow();
  });
});
