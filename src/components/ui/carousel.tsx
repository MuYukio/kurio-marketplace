import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

export function Carousel({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) =>
    track.current?.scrollBy({
      left: direction * Math.max(240, track.current.clientWidth * 0.75),
      behavior: 'smooth',
    });
  return (
    <section className={cn('kurio-carousel', className)} aria-label={label}>
      <div ref={track} className="kurio-carousel-track">
        {children}
      </div>
      <div className="kurio-carousel-controls">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Itens anteriores"
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Próximos itens"
          onClick={() => move(1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}
