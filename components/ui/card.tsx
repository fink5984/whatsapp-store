import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  title,
  sub,
  action,
  flush,
  className,
  children,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <header className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? '' : 'card-body'}>{children}</div>
    </section>
  );
}
