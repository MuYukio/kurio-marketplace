import type { EventData } from '@/shared/contracts';
type Listener = (name: 'nft.updated' | 'order.updated', event: EventData) => void;
const subscribers = new Set<Listener>();
export function subscribeMock(listener: Listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
export function emitResource(
  name: 'nft.updated' | 'order.updated',
  resourceId: string,
  version: number,
  userId?: string,
) {
  const event = {
    eventId: crypto.randomUUID(),
    resourceId,
    version,
    userId,
    occurredAt: Date.now(),
  };
  for (const fn of subscribers) fn(name, event);
  return event;
}
export function replayMock(name: 'nft.updated' | 'order.updated', event: EventData) {
  for (const fn of subscribers) fn(name, event);
}
