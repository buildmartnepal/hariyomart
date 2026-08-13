import React, { createContext, useContext, useMemo, useState } from 'react';
import { catalog } from '@/data/catalog';
type Product = (typeof catalog.products)[number];
type Line = { product: Product; quantity: number };
type CartContextValue = {
  lines: Line[];
  add: (product: Product) => void;
  update: (slug: string, quantity: number) => void;
  clear: () => void;
  count: number;
  total: number;
};
const C = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const add = (product: Product) =>
    setLines((p) => {
      const f = p.find((x) => x.product.slug === product.slug);
      return f
        ? p.map((x) =>
            x.product.slug === product.slug
              ? { ...x, quantity: Math.min(x.quantity + 1, product.stock) }
              : x,
          )
        : [...p, { product, quantity: 1 }];
    });
  const update = (slug: string, quantity: number) =>
    setLines((current) =>
      current
        .map((line) =>
          line.product.slug === slug
            ? {
                ...line,
                quantity: Math.min(Math.max(Math.floor(quantity), 0), line.product.stock),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  const clear = () => setLines([]);
  const value = useMemo(
    () => ({
      lines,
      add,
      update,
      clear,
      count: lines.reduce((a, b) => a + b.quantity, 0),
      total: lines.reduce((a, b) => a + b.quantity * b.product.price, 0),
    }),
    [lines],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useCart() {
  const context = useContext(C);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
