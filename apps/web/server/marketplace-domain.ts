export type PurchasableProduct = {
  name: string;
  price: number;
  stock: number;
  minimumOrder?: number;
};

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function deliveryFeeFor(distanceKm: number | null, subtotal: number) {
  if (distanceKm == null) return subtotal >= 2_500 ? 0 : 150;
  if (distanceKm > 300) return null;
  if (subtotal >= 3_000 && distanceKm <= 35) return 0;
  if (distanceKm <= 15) return 90;
  if (distanceKm <= 35) return 150;
  if (distanceKm <= 80) return 250;
  return 450;
}

export function validateQuantity(product: PurchasableProduct, quantity: number) {
  const minimum = Math.max(0.01, Number(product.minimumOrder || 1));
  if (!Number.isFinite(quantity) || quantity <= 0)
    return `${product.name} needs a positive quantity`;
  if (quantity < minimum) return `${product.name} has a minimum order of ${minimum}`;
  if (quantity > product.stock) return `Only ${product.stock} ${product.name} is available`;
  return null;
}

export function checkoutLineKey(line: { productId?: string; productSlug?: string }) {
  return line.productId ? `id:${line.productId}` : `slug:${line.productSlug || ''}`;
}
