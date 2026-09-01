'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  /** Render height in px. */
  height?: number;
  /** Show the human-readable value under the bars. */
  displayValue?: boolean;
  className?: string;
}

/**
 * Renders a CODE128 barcode into an inline SVG via JsBarcode.
 * CODE128 supports alphanumeric values, suitable for SKU-style codes.
 */
export function Barcode({ value, height = 50, displayValue = true, className }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        displayValue,
        fontSize: 14,
        margin: 4,
      });
    } catch {
      /* invalid value — leave empty */
    }
  }, [value, height, displayValue]);

  return <svg ref={ref} className={className} />;
}
