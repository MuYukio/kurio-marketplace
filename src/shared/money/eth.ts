const SCALE = 10n ** 18n;
export function toWei(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error('Valor ETH inválido');
  const [whole, dec = ''] = value.split('.');
  return BigInt(whole) * SCALE + BigInt(dec.padEnd(18, '0'));
}
export function fromWei(value: bigint): string {
  if (value < 0n) throw new Error('Valor negativo');
  const decimals = (value % SCALE).toString().padStart(18, '0').replace(/0+$/, '');
  return `${value / SCALE}${decimals ? '.' + decimals : ''}`;
}
export function eth(value: string): string {
  return `${fromWei(toWei(value)).replace('.', ',')} ETH`;
}
export function total(values: string[]): string {
  return fromWei(values.reduce((sum, v) => sum + toWei(v), 0n));
}
