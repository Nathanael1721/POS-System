'use client';

import { Icon } from '@/components/ui/icon';

/**
 * Global error boundary: keeps one crashing component from taking the whole
 * app down to a white screen. Offers a retry (reset) without losing the
 * session — tokens live in localStorage, not component state.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid h-screen place-items-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 text-center shadow-card">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
          <Icon name="alert-circle" className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Terjadi kesalahan</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Maaf, terjadi masalah saat menampilkan halaman ini. Sesi Anda tetap aman — coba muat
          ulang, atau kembali ke halaman kasir.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-gray-300">Kode: {error.digest}</p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Coba Lagi
          </button>
          <a
            href="/cashier"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Ke Halaman Kasir
          </a>
        </div>
      </div>
    </div>
  );
}
