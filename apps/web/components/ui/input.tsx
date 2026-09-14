import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm',
        'placeholder:text-gray-500 transition-colors',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      {...props}
    />
  );
});

/** Input with a leading icon (e.g. search) rendered inside the field. */
export const IconInput = forwardRef<HTMLInputElement, InputProps & { icon?: React.ReactNode }>(
  function IconInput({ className, icon, ...props }, ref) {
    if (!icon) return <Input ref={ref} className={className} {...props} />;
    return (
      <div className={cn('relative w-full', className)}>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        <Input ref={ref} className="pl-9" {...props} />
      </div>
    );
  },
);
