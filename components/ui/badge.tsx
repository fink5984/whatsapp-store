import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warn' | 'danger' | 'info';

export function Badge({
  variant = 'default',
  dot,
  className,
  children,
}: {
  variant?: Variant;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'badge',
        variant === 'success' && 'badge--success',
        variant === 'warn' && 'badge--warn',
        variant === 'danger' && 'badge--danger',
        variant === 'info' && 'badge--info',
        dot && 'badge--dot',
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  new: { text: 'חדשה', cls: 'status-new' },
  preparing: { text: 'בהכנה', cls: 'status-preparing' },
  ready: { text: 'מוכנה', cls: 'status-ready' },
  out: { text: 'יצא למשלוח', cls: 'status-out' },
  completed: { text: 'הושלמה', cls: 'status-completed' },
  cancelled: { text: 'בוטלה', cls: 'status-cancelled' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_LABELS[status] ?? { text: status, cls: '' };
  return <span className={cn('badge', meta.cls)}>{meta.text}</span>;
}

export { STATUS_LABELS };
