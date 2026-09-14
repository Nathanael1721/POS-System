import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty state: icon, short title, hint, optional action. */
export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('grid place-items-center px-6 py-14 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-500">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
