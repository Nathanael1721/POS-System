'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface NumPadProps {
  /** Current numeric string (digits only). */
  value: string;
  onChange: (next: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];

/**
 * Touch-friendly numeric keypad for entering the cash amount paid — the
 * standard tender-entry surface on hardware POS terminals.
 */
export function NumPad({ value, onChange }: NumPadProps) {
  function press(key: string) {
    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }
    const next = (value === '0' ? '' : value) + key;
    onChange(next.slice(0, 12));
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((key) => (
        <Button
          key={key}
          type="button"
          variant="secondary"
          onClick={() => press(key)}
          className="h-11 text-base font-semibold tabular-nums"
          aria-label={key === 'back' ? 'Hapus satu digit' : key}
        >
          {key === 'back' ? <Icon name="delete" className="h-4 w-4" /> : key}
        </Button>
      ))}
    </div>
  );
}
