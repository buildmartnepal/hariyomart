import { describe, expect, it } from 'vitest';
import { checkoutLineKey, deliveryFeeFor, money, validateQuantity } from './marketplace-domain';

describe('marketplace order rules', () => {
  it('uses the published delivery bands', () => {
    expect(deliveryFeeFor(8, 900)).toBe(90);
    expect(deliveryFeeFor(20, 900)).toBe(150);
    expect(deliveryFeeFor(50, 900)).toBe(250);
    expect(deliveryFeeFor(120, 900)).toBe(450);
    expect(deliveryFeeFor(301, 900)).toBeNull();
    expect(deliveryFeeFor(20, 3_000)).toBe(0);
  });

  it('supports fractional farm quantities and minimum orders', () => {
    const product = { name: 'Mustang apples', price: 420, stock: 12.5, minimumOrder: 0.5 };
    expect(validateQuantity(product, 0.25)).toContain('minimum order');
    expect(validateQuantity(product, 0.5)).toBeNull();
    expect(validateQuantity(product, 13)).toContain('available');
  });

  it('rounds currency and creates stable cart keys', () => {
    expect(money(10.005)).toBe(10.01);
    expect(checkoutLineKey({ productId: 'abc' })).toBe('id:abc');
    expect(checkoutLineKey({ productSlug: 'fresh-saag' })).toBe('slug:fresh-saag');
  });
});
