'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconOnly, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'btn',
        `btn--${variant}`,
        size === 'sm' && 'btn--sm',
        size === 'lg' && 'btn--lg',
        iconOnly && 'btn--icon',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
