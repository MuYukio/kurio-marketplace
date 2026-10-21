const encode = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const decode = (hex: string) => new Uint8Array(hex.match(/../g)!.map((x) => parseInt(x, 16)));
export async function derive(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: decode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  return encode(new Uint8Array(bits));
}
export async function passwordRecord(password: string) {
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derive(password, salt) };
}
