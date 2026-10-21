import axios, { AxiosError, CanceledError } from 'axios';
import type { ApiErrorBody } from '../contracts';
const TOKEN = 'kurio.session',
  GUEST = 'kurio.guest';
let generation = 0;
export const authStorage = {
  token: () => localStorage.getItem(TOKEN) || '',
  set: (token: string) => {
    generation++;
    if (token) localStorage.setItem(TOKEN, token);
    else localStorage.removeItem(TOKEN);
  },
  generation: () => generation,
};
export function guestId() {
  let id = localStorage.getItem(GUEST);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST, id);
  }
  return id;
}
export function rotateGuest() {
  localStorage.setItem(GUEST, crypto.randomUUID());
}
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 4000,
});
http.interceptors.request.use((config) => {
  config.headers.set('X-Guest-Id', guestId());
  config.headers.set('X-Session-Generation', String(generation));
  const token = authStorage.token();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
http.interceptors.response.use(
  (response) => {
    if (Number(response.config.headers.get('X-Session-Generation')) !== generation)
      throw new CanceledError('Sessão anterior');
    return response;
  },
  (error) => {
    const e = error as AxiosError<ApiErrorBody>;
    if (e.config && Number(e.config.headers.get('X-Session-Generation')) !== generation)
      return Promise.reject(new CanceledError('Sessão anterior'));
    if (e.response?.status === 401 && e.response.data.error.code === 'SESSION_EXPIRED')
      window.dispatchEvent(new Event('kurio:expired'));
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.code === 'ECONNABORTED')
      return 'A resposta demorou. A operação pode ter sido concluída. Recupere a tentativa sem criar outra compra.';
    return error.response?.data?.error?.message || 'Não foi possível conectar. Tente novamente.';
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro.';
}
export function fieldErrors(error: unknown) {
  return axios.isAxiosError<ApiErrorBody>(error)
    ? error.response?.data?.error?.fieldErrors || {}
    : {};
}
export function errorCode(error: unknown) {
  return axios.isAxiosError<ApiErrorBody>(error) ? error.response?.data?.error?.code : '';
}
export async function get<T>(path: string, signal?: AbortSignal, params?: unknown) {
  return (await http.get<T>(path, { signal, params })).data;
}
export async function post<T>(path: string, data?: unknown, idempotencyKey?: string) {
  return (
    await http.post<T>(path, data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
  ).data;
}
export async function patch<T>(path: string, data: unknown) {
  return (await http.patch<T>(path, data)).data;
}
