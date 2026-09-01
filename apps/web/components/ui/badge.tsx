import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Show a small leading dot (e.g. stock/status indicators). */
  dot?: boolean;
}

export function Badge({ variant = 'neutral', dot = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {props.children}
    </span>
  );
}
