'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Leaf, MapPin, Scale, ShoppingBasket, Star, Truck, X } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { farmForProduct } from '@/lib/marketplace';
import { useCart } from '@/components/CartProvider';
import { useProductExperience } from '@/components/ProductExperienceProvider';

export default function ComparePage() {
  const experience = useProductExperience();
  const cart = useCart();
  const products = experience.compare.flatMap((slug) => {
    const product = catalog.products.find((item) => item.slug === slug);
    return product ? [product] : [];
  });

  return <main>
    <section className="page-hero compact compare-page-hero">
      <div className="container"><span className="eyebrow"><Scale size={15}/> Product comparison</span><h1>Compare what matters before you buy.</h1><p className="section-copy">Price, origin, seller trust, stock, order unit and fulfillment side-by-side. Compare up to three Hariyo products.</p></div>
    </section>
    <section className="section">
      <div className="container">
        {!products.length ? <div className="market-empty"><Scale size={34}/><h3>No products selected</h3><p>Use the compare button on any marketplace card, then return here.</p><Link className="btn btn-primary" href="/shop">Browse products</Link></div> : <>
          <div className={`compare-grid compare-count-${products.length}`}>
            {products.map((product) => {
              const farm = farmForProduct(product);
              return <article className="compare-product" key={product.slug}>
                <button className="compare-remove" type="button" onClick={() => experience.toggleCompare(product.slug)} aria-label={`Remove ${product.name} from comparison`}><X size={16}/></button>
                <Link href={`/products/${product.slug}`} className="compare-image"><Image src={product.image} alt={product.name} width={520} height={420}/></Link>
                <div className="compare-product-body">
                  <small>{product.category.replaceAll('-', ' ')}</small>
                  <Link href={`/products/${product.slug}`}><h2>{product.name}</h2></Link>
                  <div className="compare-price">NPR {product.price.toLocaleString()} <span>/ {product.unit}</span></div>
                  {product.oldPrice > product.price && <div className="compare-saving">Save NPR {(product.oldPrice-product.price).toLocaleString()}</div>}
                  <dl className="compare-facts">
                    <div><dt><MapPin/>Origin</dt><dd>{product.district}, {product.provinceName}</dd></div>
                    <div><dt><Star/>Rating</dt><dd>{product.rating}/5</dd></div>
                    <div><dt><BadgeCheck/>Seller</dt><dd>{farm.name}</dd></div>
                    <div><dt><Truck/>Fulfillment</dt><dd>{farm.sameDay ? 'Same-day local' : 'Scheduled delivery'} · {farm.deliveryRadiusKm} km zone</dd></div>
                    <div><dt><Leaf/>Growing</dt><dd>{product.organic ? 'Organic listing' : 'Quality checked'}</dd></div>
                    <div><dt>Stock</dt><dd>{product.stock > 0 ? `${product.stock} ${product.unit} available` : 'Sold out'}</dd></div>
                    <div><dt>Minimum</dt><dd>{product.minimumOrder || 1} {product.unit}</dd></div>
                  </dl>
                  <button className="btn btn-primary btn-full" type="button" onClick={() => cart.add(product)} disabled={product.stock <= 0}><ShoppingBasket size={17}/>{product.stock > 0 ? 'Add to basket' : 'Sold out'}</button>
                </div>
              </article>;
            })}
          </div>
          <div className="compare-foot"><button type="button" className="btn btn-secondary" onClick={experience.clearCompare}>Clear comparison</button><Link className="btn btn-soft" href="/shop">Add another product</Link></div>
        </>}
      </div>
    </section>
  </main>;
}
