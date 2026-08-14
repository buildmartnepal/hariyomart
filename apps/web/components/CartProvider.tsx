'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Product } from '@/lib/catalog';
import { useAuth } from '@/components/AuthProvider';

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
  cloudSynced: boolean;
};
const CartContext = createContext<CartValue | null>(null);
const CART_STORAGE_KEY = 'hariyo-cart';
const CART_STORAGE_VERSION = 2;

function sanitizeLine(line: CartLine): CartLine | null {
  if (!line?.product?.slug || !Number.isFinite(line?.quantity) || line.quantity <= 0) return null;
  const stock = Number(line.product.stock || 0);
  const minimum = Math.max(0.01, Number(line.product.minimumOrder || 1));
  if (stock < minimum) return null;
  return { ...line, quantity: Math.max(minimum, Math.min(line.quantity, stock)) };
}

function mergeCart(localLines: CartLine[], remoteLines: CartLine[]) {
  const merged = new Map<string, CartLine>();
  for (const source of [...remoteLines, ...localLines]) {
    const clean = sanitizeLine(source);
    if (!clean) continue;
    const previous = merged.get(clean.product.slug);
    if (!previous) {
      merged.set(clean.product.slug, clean);
      continue;
    }
    const minimum = Math.max(0.01, Number(clean.product.minimumOrder || 1));
    merged.set(clean.product.slug, {
      product: clean.product,
      quantity: Math.min(
        Number(clean.product.stock || 0),
        Math.max(minimum, Math.max(previous.quantity, clean.quantity)),
      ),
    });
  }
  return [...merged.values()];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const loadedUser = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedLines = Array.isArray(parsed)
          ? parsed
          : [1, 2].includes(Number(parsed?.version)) && Array.isArray(parsed.lines)
            ? parsed.lines
            : [];
        if (storedLines.length)
          setLines(storedLines.flatMap((line: CartLine) => sanitizeLine(line) || []));
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

  useEffect(() => {
    if (!auth.ready || !hydrated) return;
    if (!auth.user) {
      loadedUser.current = null;
      setCloudSynced(false);
      return;
    }
    if (loadedUser.current === auth.user.id) return;
    let cancelled = false;
    auth
      .apiRequest<{ lines?: CartLine[] }>('/commerce/cart')
      .then((data) => {
        if (cancelled) return;
        setLines((current) => mergeCart(current, Array.isArray(data.lines) ? data.lines : []));
        loadedUser.current = auth.user!.id;
        setCloudSynced(true);
      })
      .catch(() => {
        if (!cancelled) setCloudSynced(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth, hydrated]);

  useEffect(() => {
    if (!hydrated || !auth.ready || !auth.user || loadedUser.current !== auth.user.id) return;
    const timer = window.setTimeout(() => {
      auth
        .apiRequest('/commerce/cart', {
          method: 'PUT',
          body: JSON.stringify({
            lines: lines.map((line) => ({
              productSlug: line.product.slug,
              quantity: line.quantity,
            })),
          }),
        })
        .then(() => setCloudSynced(true))
        .catch(() => setCloudSynced(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [auth, hydrated, lines]);

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
      cloudSynced,
      count: lines.reduce((a, b) => a + b.quantity, 0),
      total: lines.reduce((a, b) => a + b.quantity * b.product.price, 0),
    }),
    [add, clear, cloudSynced, lines, open, remove, update],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const v = useContext(CartContext);
  if (!v) throw new Error('CartProvider missing');
  return v;
}
