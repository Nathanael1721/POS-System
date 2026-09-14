import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className={cn('relative w-full', className)}>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-sm text-gray-900 shadow-sm',
          'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
});
