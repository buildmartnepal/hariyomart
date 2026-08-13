'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/catalog';
export type CartLine = { product: Product; quantity: number };
type CartValue = {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product, quantity?: number) => void;
  update: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  count: number;
  total: number;
};
const CartContext = createContext<CartValue | null>(null);
const CART_STORAGE_KEY = 'hariyo-cart';
const CART_STORAGE_VERSION = 1;
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedLines = Array.isArray(parsed)
          ? parsed
          : parsed?.version === CART_STORAGE_VERSION && Array.isArray(parsed.lines)
            ? parsed.lines
            : [];
        if (storedLines.length)
          setLines(
            storedLines.flatMap((line: CartLine) => {
              if (!line?.product?.slug || !Number.isFinite(line?.quantity) || line.quantity <= 0)
                return [];
              const stock = Number(line.product.stock || 0);
              const minimum = Math.max(0.01, Number(line.product.minimumOrder || 1));
              if (stock < minimum) return [];
              return [{ ...line, quantity: Math.max(minimum, Math.min(line.quantity, stock)) }];
            }),
          );
      }
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ version: CART_STORAGE_VERSION, lines }),
      );
    } catch {}
  }, [hydrated, lines]);
  const add = useCallback((product: Product, requested?: number) => {
    if (product.stock <= 0) return;
    const step = Math.max(0.01, Number(product.minimumOrder || 1));
    const quantity = Math.max(step, Number(requested || step));
    setLines((previous) => {
      const found = previous.find((line) => line.product.slug === product.slug);
      if (!found) return [...previous, { product, quantity: Math.min(quantity, product.stock) }];
      return previous.map((line) =>
        line.product.slug === product.slug
          ? { ...line, product, quantity: Math.min(product.stock, line.quantity + quantity) }
          : line,
      );
    });
    setOpen(true);
  }, []);
  const update = useCallback((slug: string, quantity: number) => {
    setLines((previous) =>
      previous.flatMap((line) => {
        if (line.product.slug !== slug) return [line];
        const minimum = Math.max(0.01, Number(line.product.minimumOrder || 1));
        if (quantity < minimum) return [];
        return [{ ...line, quantity: Math.min(line.product.stock, quantity) }];
      }),
    );
  }, []);
  const remove = useCallback(
    (slug: string) => setLines((previous) => previous.filter((line) => line.product.slug !== slug)),
    [],
  );
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(
    () => ({
      lines,
      open,
      setOpen,
      add,
      update,
      remove,
      clear,
      count: lines.reduce((a, b) => a + b.quantity, 0),
      total: lines.reduce((a, b) => a + b.quantity * b.product.price, 0),
    }),
    [add, clear, lines, open, remove, update],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const v = useContext(CartContext);
  if (!v) throw new Error('CartProvider missing');
  return v;
}
